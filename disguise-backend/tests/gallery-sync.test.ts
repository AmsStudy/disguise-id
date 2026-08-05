import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import jwt from 'jsonwebtoken';

jest.mock('../src/config/redis', () => ({
  getRedis: jest.fn().mockReturnValue({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }),
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

describe('Phase 5C: Dry-Run Mapping Validation', () => {
  let adminToken: string;
  const testOrgId = 'org-sync-1';
  const adminId = 'user-sync-admin';

  beforeAll(async () => {
    adminToken = jwt.sign(
      { sub: adminId, email: 'syncadmin@org1.com', role: 'admin', orgId: testOrgId },
      process.env.JWT_SECRET || 'secret'
    );

    await prisma.organization.create({
      data: { id: testOrgId, name: 'Org Sync 1', code: 'OS1' },
    });

    await prisma.user.create({
      data: { id: adminId, email: 'syncadmin@org1.com', passwordHash: 'pwd', fullName: 'Sync Admin', role: 'admin', organizationId: testOrgId },
    });
  });

  afterAll(async () => {
    await prisma.mlV2CandidateMapping.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.mlV2GalleryCandidate.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.watchlistPerson.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.user.deleteMany({ where: { organizationId: testOrgId } });
    await prisma.organization.deleteMany({ where: { id: testOrgId } });
  });

  it('Empty organization returns a valid empty report', async () => {
    const res = await request(app)
      .post('/api/v1/ml-v2/gallery/sync/dry-run')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.validCandidatesCount).toBe(0);
    expect(res.body.data.pendingMappingsCount).toBe(0);
    expect(res.body.data.orphanCandidates).toHaveLength(0);
  });

  it('Orphan candidate is reported', async () => {
    await prisma.mlV2GalleryCandidate.create({
      data: {
        galleryCandidateId: 'orphan-cand-1',
        organizationId: testOrgId,
        sourcePersonId: 'none',
        status: 'ACTIVE'
      }
    });

    const res = await request(app)
      .post('/api/v1/ml-v2/gallery/sync/dry-run')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orphanCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ galleryCandidateId: 'orphan-cand-1' })
      ])
    );
  });
});
