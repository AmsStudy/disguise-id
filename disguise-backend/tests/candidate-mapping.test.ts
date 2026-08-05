import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import jwt from 'jsonwebtoken';

jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  }),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

describe('Phase 5C: Maker-Checker Candidate Mapping', () => {
  let adminToken: string;
  let investigatorToken: string;
  let otherOrgAdminToken: string;
  const testOrgId = 'org-1';
  const otherOrgId = 'org-2';
  const adminId = 'user-admin';
  const invId = 'user-inv';
  const personId = 'person-1';

  beforeAll(async () => {
    adminToken = jwt.sign(
      { sub: adminId, email: 'admin@org1.com', role: 'admin', orgId: testOrgId },
      process.env.JWT_SECRET || 'secret'
    );

    investigatorToken = jwt.sign(
      { sub: invId, email: 'inv@org1.com', role: 'investigator', orgId: testOrgId },
      process.env.JWT_SECRET || 'secret'
    );

    otherOrgAdminToken = jwt.sign(
      { sub: 'user-2', email: 'admin@org2.com', role: 'admin', orgId: otherOrgId },
      process.env.JWT_SECRET || 'secret'
    );

    // Seed data
    await prisma.organization.createMany({
      data: [
        { id: testOrgId, name: 'Org 1', code: 'O1' },
        { id: otherOrgId, name: 'Org 2', code: 'O2' },
      ],
      skipDuplicates: true,
    });

    await prisma.user.createMany({
        data: [
            { id: adminId, email: 'admin@org1.com', passwordHash: 'pwd', fullName: 'A', role: 'admin', organizationId: testOrgId },
            { id: invId, email: 'inv@org1.com', passwordHash: 'pwd', fullName: 'B', role: 'investigator', organizationId: testOrgId },
        ],
        skipDuplicates: true
    });

    await prisma.watchlistPerson.create({
      data: { id: personId, organizationId: testOrgId, fullName: 'Test Person' },
    });
  });

  afterAll(async () => {
    await prisma.mlV2CandidateMapping.deleteMany({ where: { organizationId: { in: [testOrgId, otherOrgId] } } });
    await prisma.mlV2GalleryCandidate.deleteMany({ where: { organizationId: { in: [testOrgId, otherOrgId] } } });
    await prisma.watchlistPerson.deleteMany({ where: { organizationId: { in: [testOrgId, otherOrgId] } } });
    await prisma.user.deleteMany({ where: { organizationId: { in: [testOrgId, otherOrgId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [testOrgId, otherOrgId] } } });
  });

  let pendingMappingId = '';

  it('Investigators can CREATE mappings (status goes to PENDING)', async () => {
    const res = await request(app)
      .post('/api/v1/ml-v2/candidate-mappings')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({ watchlistPersonId: personId, reason: 'test create' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    pendingMappingId = res.body.data.id;
  });

  it('Admins can CREATE mappings (status goes to PENDING)', async () => {
    const person2 = 'person-2';
    await prisma.watchlistPerson.create({ data: { id: person2, organizationId: testOrgId, fullName: 'Test 2' } });

    const res = await request(app)
      .post('/api/v1/ml-v2/candidate-mappings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ watchlistPersonId: person2, reason: 'test create admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
  });

  it('Investigators CANNOT approve mappings', async () => {
    const res = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${pendingMappingId}/approve`)
      .set('Authorization', `Bearer ${investigatorToken}`);

    // Auth middleware returns 403 when roles do not match authorize('admin')
    expect(res.status).toBe(403);
  });

  it('Admins CANNOT approve their own proposals (Maker-Checker)', async () => {
    // Admin creates mapping
    const person3 = 'person-3';
    await prisma.watchlistPerson.create({ data: { id: person3, organizationId: testOrgId, fullName: 'Test 3' } });

    const createRes = await request(app)
      .post('/api/v1/ml-v2/candidate-mappings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ watchlistPersonId: person3 });

    expect(createRes.status).toBe(201);
    const adminMappingId = createRes.body.data.id;

    // Same admin tries to approve
    const approveRes = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${adminMappingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(approveRes.status).toBe(403);
    expect(approveRes.body.error.message).toMatch(/Proposer cannot approve their own mapping/i);

    // Another admin CAN approve
    const approveRes2 = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${adminMappingId}/approve`)
      .set('Authorization', `Bearer ${otherOrgAdminToken}`);

    // Wait, otherOrgAdminToken is from Org 2. It should fail cross-org.
    expect(approveRes2.status).toBe(400); // Or 404 depending on how it's handled. Service says "Mapping not found" which is 400 badRequest.
    expect(approveRes2.body.error.message).toMatch(/Mapping not found/i);
  });

  it('Admins can APPROVE pending mappings proposed by others (status goes ACTIVE)', async () => {
    const res = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${pendingMappingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.approvedById).toBe(adminId);
  });

  it('Mappings in ACTIVE state cannot be approved again', async () => {
    const res = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${pendingMappingId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Service throws 400 Bad Request
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Only PENDING mappings can be approved/i);
  });

  it('DB Constraint rejects concurrent PENDING mapping for same candidate', async () => {
    // 1. Get the existing active candidate from the previous tests
    const mapping1 = await prisma.mlV2CandidateMapping.findUnique({
      where: { id: pendingMappingId }
    });
    const candidateId = mapping1!.galleryCandidateId;

    // 2. Create a new person
    const person4 = 'person-4';
    await prisma.watchlistPerson.create({ data: { id: person4, organizationId: testOrgId, fullName: 'Test 4' } });

    // 3. Try to map this new person to the same candidate
    const createRes = await request(app)
      .post('/api/v1/ml-v2/candidate-mappings')
      .set('Authorization', `Bearer ${investigatorToken}`)
      .send({ watchlistPersonId: person4, galleryCandidateId: candidateId });

    expect(createRes.status).toBe(409);
    expect(createRes.body.error.code).toBe('CANDIDATE_MAPPING_CONFLICT');
  });

  it('PENDING mappings cannot be revoked (returns 409)', async () => {
    // Admin creates mapping
    const person5 = 'person-5';
    await prisma.watchlistPerson.create({ data: { id: person5, organizationId: testOrgId, fullName: 'Test 5' } });

    const createRes = await request(app)
      .post('/api/v1/ml-v2/candidate-mappings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ watchlistPersonId: person5 });

    const adminMappingId = createRes.body.data.id;

    // Try to revoke
    const revokeRes = await request(app)
      .post(`/api/v1/ml-v2/candidate-mappings/${adminMappingId}/revoke`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(revokeRes.status).toBe(409);
    expect(revokeRes.body.error.message).toMatch(/Proposer withdrawal is currently unsupported/i);
  });
});
