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

describe('Phase 3F: ML V2 Reviewed Alert Creation', () => {
  let orgId1: string;
  let orgId2: string;
  let adminToken1: string;
  let adminToken2: string;
  let investigatorToken1: string;
  let operatorToken1: string;
  let adminId1: string;

  beforeAll(async () => {
    // 1. Create orgs
    const org1 = await prisma.organization.create({ data: { name: 'Org 1', code: 'ORG1_ALERT' } });
    const org2 = await prisma.organization.create({ data: { name: 'Org 2', code: 'ORG2_ALERT' } });
    orgId1 = org1.id;
    orgId2 = org2.id;

    // 2. Create users
    const admin1 = await prisma.user.create({
      data: { organizationId: orgId1, email: 'admin1_alert@org1.com', passwordHash: 'hash', role: 'admin', fullName: 'A B' }
    });
    const admin2 = await prisma.user.create({
      data: { organizationId: orgId2, email: 'admin2_alert@org2.com', passwordHash: 'hash', role: 'admin', fullName: 'C D' }
    });
    const operator1 = await prisma.user.create({
      data: { organizationId: orgId1, email: 'op1_alert@org1.com', passwordHash: 'hash', role: 'operator', fullName: 'E F' }
    });
    const investigator1 = await prisma.user.create({
      data: { organizationId: orgId1, email: 'inv1_alert@org1.com', passwordHash: 'hash', role: 'investigator', fullName: 'G H' }
    });
    adminId1 = admin1.id;

    // 3. Generate tokens
    adminToken1 = generateToken({ sub: admin1.id, orgId: orgId1, role: 'admin' });
    adminToken2 = generateToken({ sub: admin2.id, orgId: orgId2, role: 'admin' });
    operatorToken1 = generateToken({ sub: operator1.id, orgId: orgId1, role: 'operator' });
    investigatorToken1 = generateToken({ sub: investigator1.id, orgId: orgId1, role: 'investigator' });
  });

  afterAll(async () => {
    // Cleanup only this suite's orgs
    const orgs = [orgId1, orgId2].filter(Boolean);
    if (orgs.length > 0) {
      await prisma.mlV2ReviewedAlert.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2ReviewedPromotion.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2OperatorReview.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.mlV2InferenceResult.deleteMany({ where: { detectionEvent: { organizationId: { in: orgs } } } });
      await prisma.detectionEvent.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.cctvSource.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.user.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.auditLog.deleteMany({ where: { organizationId: { in: orgs } } });
      await prisma.organization.deleteMany({ where: { id: { in: orgs } } });
    }
  });

  // Helper to seed a complete chain up to promotion
  async function seedPromotedReview(orgId: string, userId: string) {
    const source = await prisma.cctvSource.create({
      data: { organizationId: orgId, name: 'Cam 1' }
    });

    const event = await prisma.detectionEvent.create({
      data: { organizationId: orgId, sourceId: source.id, detectedAt: new Date() }
    });

    const inference = await prisma.mlV2InferenceResult.create({
      data: {
        detectionEventId: event.id,
        candidateId: 'DID001',
        score: 0.9,
        margin: 0.1,
        frameDecision: 'POSITIVE',
        selectedBranch: 'M1',
        status: 'PENDING_REVIEW'
      }
    });

    const review = await prisma.mlV2OperatorReview.create({
      data: {
        inferenceResultId: inference.id,
        organizationId: orgId,
        status: 'COMPLETED',
        decision: 'CONFIRMED',
        reviewerId: userId,
        reviewedCandidateId: 'DID001',
        claimedAt: new Date(),
        reviewedAt: new Date(),
      }
    });

    const promotion = await prisma.mlV2ReviewedPromotion.create({
      data: {
        reviewId: review.id,
        organizationId: orgId,
        promotedById: userId,
        promotedCandidateId: 'DID001',
        promotedAt: new Date()
      }
    });

    return { event, inference, review, promotion };
  }

  describe('GET /api/v1/ml-v2/alert-creation-queue', () => {
    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/v1/ml-v2/alert-creation-queue');
      expect(res.status).toBe(401);
    });

    it('should allow operator to read queue', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/alert-creation-queue')
        .set('Authorization', `Bearer ${operatorToken1}`);
      expect(res.status).toBe(200);
    });

    it('should return empty queue if no eligible promotions exist', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/alert-creation-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should list eligible promotions', async () => {
      const { promotion } = await seedPromotedReview(orgId1, adminId1);

      const res = await request(app)
        .get('/api/v1/ml-v2/alert-creation-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].id).toBe(promotion.id);
    });

    it('should strictly isolate by organization', async () => {
      await seedPromotedReview(orgId2, adminId1); // in org 2

      const res = await request(app)
        .get('/api/v1/ml-v2/alert-creation-queue')
        .set('Authorization', `Bearer ${adminToken1}`); // org 1
      
      expect(res.status).toBe(200);
      const items = res.body.data;
      items.forEach((item: any) => {
        expect(item.organizationId).toBe(orgId1);
      });
    });

    it('should omit promotions that already have alerts', async () => {
      const { promotion, event } = await seedPromotedReview(orgId1, adminId1);
      
      await prisma.mlV2ReviewedAlert.create({
        data: {
          promotionId: promotion.id,
          organizationId: orgId1,
          detectionEventId: event.id,
          createdById: adminId1,
          promotedCandidateId: 'DID001',
          title: 'Title'
        }
      });

      const res = await request(app)
        .get('/api/v1/ml-v2/alert-creation-queue')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      const items = res.body.data;
      expect(items.find((i: any) => i.id === promotion.id)).toBeUndefined();
    });
  });

  describe('POST /api/v1/ml-v2/promotions/:promotionId/create-alert', () => {
    it('should create a reviewed alert for an eligible promotion', async () => {
      const { promotion, review, inference } = await seedPromotedReview(orgId1, adminId1);

      const res = await request(app)
        .post(`/api/v1/ml-v2/promotions/${promotion.id}/create-alert`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({ notes: 'Action required' });

      expect(res.status).toBe(201);
      expect(res.body.data.promotionId).toBe(promotion.id);
      expect(res.body.data.promotedCandidateId).toBe('DID001');

      // Ensure NO V1 Alert was created
      const v1Alerts = await prisma.alert.count();
      expect(v1Alerts).toBe(0);

      // Verify Audit Log
      const auditLog = await prisma.auditLog.findFirst({
        where: { action: 'ML_V2_REVIEWED_ALERT_CREATED', resourceId: res.body.data.id }
      });
      expect(auditLog).toBeDefined();
      expect((auditLog?.newValue as any).promotionId).toBe(promotion.id);
    });

    it('should return 403 if operator attempts to create alert', async () => {
      const { promotion } = await seedPromotedReview(orgId1, adminId1);

      const res = await request(app)
        .post(`/api/v1/ml-v2/promotions/${promotion.id}/create-alert`)
        .set('Authorization', `Bearer ${operatorToken1}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should return 409 on idempotency conflict', async () => {
      const { promotion } = await seedPromotedReview(orgId1, adminId1);

      await request(app)
        .post(`/api/v1/ml-v2/promotions/${promotion.id}/create-alert`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      const res2 = await request(app)
        .post(`/api/v1/ml-v2/promotions/${promotion.id}/create-alert`)
        .set('Authorization', `Bearer ${adminToken1}`)
        .send({});

      expect(res2.status).toBe(409);
    });

    it('should return 404 for cross-org alert creation', async () => {
      const { promotion } = await seedPromotedReview(orgId2, adminId1);

      const res = await request(app)
        .post(`/api/v1/ml-v2/promotions/${promotion.id}/create-alert`)
        .set('Authorization', `Bearer ${adminToken1}`) // token for org1
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/ml-v2/reviewed-alerts', () => {
    it('should return historical reviewed alerts', async () => {
      const { promotion, event } = await seedPromotedReview(orgId1, adminId1);
      
      const alert = await prisma.mlV2ReviewedAlert.create({
        data: {
          promotionId: promotion.id,
          organizationId: orgId1,
          detectionEventId: event.id,
          createdById: adminId1,
          promotedCandidateId: 'DID001',
          title: 'Title'
        }
      });

      const res = await request(app)
        .get('/api/v1/ml-v2/reviewed-alerts')
        .set('Authorization', `Bearer ${adminToken1}`);
      
      expect(res.status).toBe(200);
      expect(res.body.data.some((i: any) => i.id === alert.id)).toBe(true);
    });

    it('should strictly isolate reviewed alerts by organization', async () => {
      const { promotion, event } = await seedPromotedReview(orgId2, adminId1);
      
      await prisma.mlV2ReviewedAlert.create({
        data: {
          promotionId: promotion.id,
          organizationId: orgId2,
          detectionEventId: event.id,
          createdById: adminId1,
          promotedCandidateId: 'DID001',
          title: 'Title'
        }
      });

      const res = await request(app)
        .get('/api/v1/ml-v2/reviewed-alerts')
        .set('Authorization', `Bearer ${adminToken1}`); // org1
      
      expect(res.status).toBe(200);
      const items = res.body.data;
      items.forEach((item: any) => {
        expect(item.organizationId).toBe(orgId1); // shouldn't contain org2
      });
    });
  });
});
