import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { sign } from 'jsonwebtoken';

jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

const generateToken = (payload: object) => {
  return sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

describe('Phase 3E: ML V2 Reviewed Result Promotion', () => {
  let orgId1: string;
  let orgId2: string;
  let adminToken1: string;
  let adminToken2: string;
  let operatorToken1: string;
  let adminId1: string;

  beforeAll(async () => {
    // 1. Create orgs
    const org1 = await prisma.organization.create({ data: { name: 'Org 1', code: 'ORG1_PROMO' } });
    const org2 = await prisma.organization.create({ data: { name: 'Org 2', code: 'ORG2_PROMO' } });
    orgId1 = org1.id;
    orgId2 = org2.id;

    // 2. Create users
    const admin1 = await prisma.user.create({
      data: { organizationId: orgId1, email: 'admin1_promo@org1.com', passwordHash: 'hash', role: 'admin', fullName: 'A B' }
    });
    const admin2 = await prisma.user.create({
      data: { organizationId: orgId2, email: 'admin2_promo@org2.com', passwordHash: 'hash', role: 'admin', fullName: 'C D' }
    });
    const operator1 = await prisma.user.create({
      data: { organizationId: orgId1, email: 'op1_promo@org1.com', passwordHash: 'hash', role: 'operator', fullName: 'E F' }
    });
    adminId1 = admin1.id;

    // 3. Generate tokens
    adminToken1 = generateToken({ sub: admin1.id, orgId: orgId1, role: 'admin' });
    adminToken2 = generateToken({ sub: admin2.id, orgId: orgId2, role: 'admin' });
    operatorToken1 = generateToken({ sub: operator1.id, orgId: orgId1, role: 'operator' });
  });

  afterAll(async () => {
    // Cleanup only this suite's orgs
    const orgs = [orgId1, orgId2].filter(Boolean);
    if (orgs.length > 0) {
      await prisma.mlV2ReviewedPromotion.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2OperatorReview.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2InferenceResult.deleteMany({ where: { detectionEvent: { organizationId: { in: orgs } } } });
      await prisma.detectionEvent.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.cctvSource.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.user.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    }
    await prisma.$disconnect();
  });

  afterEach(async () => {
    const orgs = [orgId1, orgId2].filter(Boolean);
    if (orgs.length > 0) {
      await prisma.mlV2ReviewedPromotion.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2OperatorReview.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2InferenceResult.deleteMany({ where: { detectionEvent: { organizationId: { in: orgs } } } });
      await prisma.detectionEvent.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.cctvSource.deleteMany({ where: { organizationId: { in: orgs } } });
      
      const adminUsers = await prisma.user.findMany({ where: { organizationId: { in: orgs } } });
      const userIds = adminUsers.map(u => u.id);
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    }
  });

  async function seedConfirmedReview(orgId: string, reviewerId: string) {
    const source = await prisma.cctvSource.create({
      data: { organizationId: orgId, name: 'Cam Promo' }
    });
    const event = await prisma.detectionEvent.create({
      data: { organizationId: orgId, sourceId: source.id, frameUrl: 'test.jpg' }
    });

    const inference = await prisma.mlV2InferenceResult.create({
      data: {
        detectionEventId: event.id,
        status: 'SUCCESS',
        candidateId: 'DID001',
        score: 95.0,
        margin: 5.0,
        frameDecision: 'HIGH_PRIORITY_CANDIDATE',
        requiresOperatorVerification: true,
      }
    });

    const review = await prisma.mlV2OperatorReview.create({
      data: {
        inferenceResultId: inference.id,
        organizationId: orgId,
        reviewerId,
        status: 'COMPLETED',
        decision: 'CONFIRMED',
        reviewedCandidateId: 'DID001',
        claimedAt: new Date(),
        reviewedAt: new Date(),
      }
    });

    return { event, inference, review };
  }

  describe('GET /api/v1/ml-v2/promotion-queue', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/ml-v2/promotion-queue');
      expect(res.status).toBe(401);
    });

    it('should return empty queue if no confirmed reviews exist', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/promotion-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return confirmed reviews in the queue', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);

      const res = await request(app)
        .get('/api/v1/ml-v2/promotion-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(review.id);
    });

    it('should NOT return reviews from other orgs', async () => {
      await seedConfirmedReview(orgId2, adminId1); // Created in org2

      const res = await request(app)
        .get('/api/v1/ml-v2/promotion-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should NOT return already promoted reviews in the queue', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      
      await prisma.mlV2ReviewedPromotion.create({
        data: {
          reviewId: review.id,
          organizationId: orgId1,
          promotedById: adminId1,
          promotedCandidateId: review.reviewedCandidateId!,
        }
      });

      const res = await request(app)
        .get('/api/v1/ml-v2/promotion-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0); // Queue should be empty now
    });
  });

  describe('POST /api/v1/ml-v2/reviews/:id/promote', () => {
    it('should promote a confirmed review successfully (DID001 without WatchlistPerson row)', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ notes: 'Confirmed and verified by intel' });

      expect(res.status).toBe(201);
      expect(res.body.reviewId).toBe(review.id);
      expect(res.body.promotedCandidateId).toBe('DID001'); // Explicit DID001 test
      expect(res.body.notes).toBe('Confirmed and verified by intel');

      // Verify no Alert was created
      const alertsCount = await prisma.alert.count();
      expect(alertsCount).toBe(0);

      // Verify Audit Log
      const auditLogs = await prisma.auditLog.findMany({ where: { action: 'ML_V2_REVIEW_PROMOTED' } });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].userId).toBe(adminId1);
      expect(auditLogs[0].resourceId).toBe(res.body.id);

      // Verification that queue is empty now
      const queueRes = await request(app).get('/api/v1/ml-v2/promotion-queue').set('Authorization', `Bearer ${adminToken1}`);
      expect(queueRes.body.data).toHaveLength(0);
    });

    it('should promote a confirmed review successfully with DID003', async () => {
      // Modify the seed to use DID003
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      await prisma.mlV2InferenceResult.update({ where: { id: review.inferenceResultId }, data: { candidateId: 'DID003' } });
      await prisma.mlV2OperatorReview.update({ where: { id: review.id }, data: { reviewedCandidateId: 'DID003' } });

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ notes: 'DID003 verification' });

      expect(res.status).toBe(201);
      expect(res.body.promotedCandidateId).toBe('DID003'); // Explicit DID003 test
    });

    it('should return 409 if already promoted', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);

      // First promotion
      await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      // Second promotion
      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('already promoted');
    });

    it('should prevent operator from promoting', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should return 404 for cross-org promotion attempt', async () => {
      const { review } = await seedConfirmedReview(orgId2, adminId1); // Created in org2

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`) // Token is for org1
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 400 if trying to promote a PENDING review', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      await prisma.mlV2OperatorReview.update({
        where: { id: review.id },
        data: { status: 'PENDING' }
      });

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('PENDING');
    });

    it('should return 400 if trying to promote a REJECTED review', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      await prisma.mlV2OperatorReview.update({
        where: { id: review.id },
        data: { decision: 'REJECTED' }
      });

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${review.id}/promote`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('REJECTED');
    });
  });

  describe('GET /api/v1/ml-v2/promotions', () => {
    it('should list historical promotions', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      await prisma.mlV2ReviewedPromotion.create({
        data: {
          reviewId: review.id,
          organizationId: orgId1,
          promotedById: adminId1,
          promotedCandidateId: review.reviewedCandidateId!,
        }
      });

      const res = await request(app)
        .get('/api/v1/ml-v2/promotions')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].reviewId).toBe(review.id);
    });

    it('should support pagination and filtering', async () => {
      const { review } = await seedConfirmedReview(orgId1, adminId1);
      await prisma.mlV2ReviewedPromotion.create({
        data: {
          reviewId: review.id,
          organizationId: orgId1,
          promotedById: adminId1,
          promotedCandidateId: review.reviewedCandidateId!,
        }
      });

      const res = await request(app)
        .get(`/api/v1/ml-v2/promotions?promotedCandidateId=${review.reviewedCandidateId}`)
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
