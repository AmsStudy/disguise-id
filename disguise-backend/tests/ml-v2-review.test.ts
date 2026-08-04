import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'jsonwebtoken';

jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const ORG_ID = uuidv4();
const ORG2_ID = uuidv4();
const ADMIN_ID = uuidv4();
const OPERATOR_ID = uuidv4();
const OPERATOR2_ID = uuidv4();
const USER_ID = uuidv4(); // normal user, not allowed

function generateToken(userId: string, role: string, orgId: string) {
  return sign({ sub: userId, email: `${role}@test.com`, role, orgId }, JWT_SECRET, { expiresIn: '1h' });
}

const adminToken = generateToken(ADMIN_ID, 'admin', ORG_ID);
const operatorToken = generateToken(OPERATOR_ID, 'operator', ORG_ID);
const operator2Token = generateToken(OPERATOR2_ID, 'operator', ORG_ID);
const userToken = generateToken(USER_ID, 'user', ORG_ID);
const otherOrgToken = generateToken(uuidv4(), 'operator', ORG2_ID);

describe('ML V2 Review Workflow API (Phase 3D)', () => {
  let sourceId: string;
  let detectionEventIdEligible: string;
  let detectionEventIdUnknown: string;
  let eligibleInferenceId: string;
  let unknownInferenceId: string;
  let claimedInferenceId: string;

  beforeAll(async () => {
    // Cleanup first to avoid Unique Constraint failures from previous interrupted runs
    await prisma.mlV2OperatorReview.deleteMany({});
    await prisma.mlV2InferenceResult.deleteMany({});
    await prisma.detectionEvent.deleteMany({});
    await prisma.cctvSource.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'operator@test.com', 'operator2@test.com', 'user@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { code: { in: ['ORG1', 'ORG2'] } }
    });

    // Setup Organizations and CctvSource
    await prisma.organization.createMany({
      data: [
        { id: ORG_ID, name: 'Org 1', code: 'ORG1' },
        { id: ORG2_ID, name: 'Org 2', code: 'ORG2' }
      ]
    });

    await prisma.user.createMany({
      data: [
        { id: ADMIN_ID, organizationId: ORG_ID, email: 'admin@test.com', passwordHash: 'hash', fullName: 'Admin', role: 'admin' },
        { id: OPERATOR_ID, organizationId: ORG_ID, email: 'operator@test.com', passwordHash: 'hash', fullName: 'Op', role: 'operator' },
        { id: OPERATOR2_ID, organizationId: ORG_ID, email: 'operator2@test.com', passwordHash: 'hash', fullName: 'Op2', role: 'operator' },
        { id: USER_ID, organizationId: ORG_ID, email: 'user@test.com', passwordHash: 'hash', fullName: 'User', role: 'user' },
      ]
    });

    const source = await prisma.cctvSource.create({
      data: { organizationId: ORG_ID, name: 'Cam 1' }
    });
    sourceId = source.id;

    // Create Eligible Event & Result
    const ev1 = await prisma.detectionEvent.create({
      data: { organizationId: ORG_ID, sourceId, frameUrl: 'http://test/1.jpg' }
    });
    detectionEventIdEligible = ev1.id;

    const inf1 = await prisma.mlV2InferenceResult.create({
      data: {
        detectionEventId: detectionEventIdEligible,
        status: 'SUCCESS',
        requiresOperatorVerification: true,
        frameDecision: 'HIGH_PRIORITY_CANDIDATE',
        candidateId: 'DID001',
        score: 0.88,
      }
    });
    eligibleInferenceId = inf1.id;

    // Create UNKNOWN Event & Result
    const ev2 = await prisma.detectionEvent.create({
      data: { organizationId: ORG_ID, sourceId, frameUrl: 'http://test/2.jpg' }
    });
    detectionEventIdUnknown = ev2.id;

    const inf2 = await prisma.mlV2InferenceResult.create({
      data: {
        detectionEventId: detectionEventIdUnknown,
        status: 'SUCCESS',
        requiresOperatorVerification: false,
        frameDecision: 'UNKNOWN',
        candidateId: 'DID003',
        score: 0.1,
      }
    });
    unknownInferenceId = inf2.id;

    // Create Claimed Event & Result
    const ev3 = await prisma.detectionEvent.create({
      data: { organizationId: ORG_ID, sourceId, frameUrl: 'http://test/3.jpg' }
    });

    const inf3 = await prisma.mlV2InferenceResult.create({
      data: {
        detectionEventId: ev3.id,
        status: 'SUCCESS',
        requiresOperatorVerification: true,
        frameDecision: 'POSSIBLE_CANDIDATE',
        candidateId: 'DID005',
        score: 0.6,
      }
    });
    claimedInferenceId = inf3.id;

    await prisma.mlV2OperatorReview.create({
      data: {
        inferenceResultId: claimedInferenceId,
        organizationId: ORG_ID,
        reviewerId: OPERATOR_ID,
        status: 'PENDING',
      }
    });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({});
    await prisma.mlV2OperatorReview.deleteMany({});
    await prisma.mlV2InferenceResult.deleteMany({});
    await prisma.detectionEvent.deleteMany({});
    await prisma.cctvSource.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { in: ['admin@test.com', 'operator@test.com', 'operator2@test.com', 'user@test.com'] } }
    });
    await prisma.organization.deleteMany({
      where: { code: { in: ['ORG1', 'ORG2'] } }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/v1/ml-v2/review-queue', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/ml-v2/review-queue');
      expect(res.status).toBe(401);
    });

    it('should reject unauthorized role (user)', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/review-queue')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow operator to view queue', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/review-queue')
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      const items = res.body.data;
      // Should include unclaimed (eligibleInferenceId) and claimed_by_me (claimedInferenceId)
      expect(items.find((i: any) => i.id === eligibleInferenceId)).toBeDefined();
      expect(items.find((i: any) => i.id === claimedInferenceId)).toBeDefined();
      expect(items.find((i: any) => i.id === unknownInferenceId)).toBeUndefined();
    });

    it('should exclude FAILED or UNKNOWN from queue', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/review-queue')
        .set('Authorization', `Bearer ${adminToken}`);
      const items = res.body.data;
      const unknownItem = items.find((i: any) => i.id === unknownInferenceId);
      expect(unknownItem).toBeUndefined();
    });

    it('should enforce organization isolation', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/review-queue')
        .set('Authorization', `Bearer ${otherOrgToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('POST /api/v1/ml-v2/inference-results/:id/review (Claim)', () => {
    it('should claim an eligible result', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/inference-results/${eligibleInferenceId}/review`)
        .set('Authorization', `Bearer ${operator2Token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.reviewerId).toBe(OPERATOR2_ID);

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: { resourceId: res.body.data.id, action: 'ML_V2_REVIEW_CLAIMED' }
      });
      expect(audit).toBeDefined();
    });

    it('same reviewer repeating claim is idempotent', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/inference-results/${eligibleInferenceId}/review`)
        .set('Authorization', `Bearer ${operator2Token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('another reviewer claim returns 409', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/inference-results/${eligibleInferenceId}/review`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(res.status).toBe(409);
    });

    it('rejects claim for UNKNOWN result', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/inference-results/${unknownInferenceId}/review`)
        .set('Authorization', `Bearer ${operatorToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/ml-v2/reviews/:id/complete (Complete)', () => {
    let reviewIdToComplete: string;

    beforeAll(async () => {
      const review = await prisma.mlV2OperatorReview.findFirst({
        where: { reviewerId: OPERATOR2_ID, status: 'PENDING' }
      });
      reviewIdToComplete = review!.id;
    });

    it('another operator cannot complete someone elses review', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${reviewIdToComplete}/complete`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ decision: 'CONFIRMED', reviewedCandidateId: 'DID001' });
      expect(res.status).toBe(403);
    });

    it('admin can complete someone elses review', async () => {
      const adminRes = await request(app)
        .post(`/api/v1/ml-v2/reviews/${reviewIdToComplete}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'CONFIRMED', reviewedCandidateId: 'DID999' });
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.status).toBe('COMPLETED');
      expect(adminRes.body.data.reviewedCandidateId).toBe('DID999');
    });

    it('already completed review returns 409', async () => {
      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${reviewIdToComplete}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'REJECTED', notes: 'too late' });
      expect(res.status).toBe(409);
    });
    
    it('REJECTED payload rejects reviewedCandidateId', async () => {
      // Create a fresh pending review for this test
      const tempEv = await prisma.detectionEvent.create({ data: { organizationId: ORG_ID, sourceId } });
      const tempInf = await prisma.mlV2InferenceResult.create({
        data: { detectionEventId: tempEv.id, status: 'SUCCESS', requiresOperatorVerification: true, frameDecision: 'POSSIBLE_CANDIDATE' }
      });
      const reviewRes = await request(app).post(`/api/v1/ml-v2/inference-results/${tempInf.id}/review`).set('Authorization', `Bearer ${operatorToken}`);
      const rId = reviewRes.body.data.id;

      const res = await request(app)
        .post(`/api/v1/ml-v2/reviews/${rId}/complete`)
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({ decision: 'REJECTED', reviewedCandidateId: 'DID001', notes: 'rejecting' });
      
      expect(res.status).toBe(400); // Validation error
    });
  });
});
