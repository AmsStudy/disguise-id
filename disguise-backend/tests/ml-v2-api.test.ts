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

describe('Phase 3C: ML V2 Observability API', () => {
  let adminToken: string;
  let otherOrgAdminToken: string;
  let testOrgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    // Basic setup for tests - assuming standard DB setup
    testOrgId = 'org-1';
    otherOrgId = 'org-2';
    
    adminToken = jwt.sign(
      { sub: 'user-1', email: 'admin@org1.com', role: 'admin', orgId: testOrgId },
      process.env.JWT_SECRET || 'secret'
    );

    otherOrgAdminToken = jwt.sign(
      { sub: 'user-2', email: 'admin@org2.com', role: 'admin', orgId: otherOrgId },
      process.env.JWT_SECRET || 'secret'
    );
  });

  describe('GET /api/v1/ml-v2', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/v1/ml-v2');
      expect(res.status).toBe(401);
    });

    it('should return 200 and list items with valid admin token', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toBeDefined();
    });

    // Add more granular pagination and filtering tests...
  });

  describe('GET /api/v1/ml-v2/stats', () => {
    it('should return stats for the organization', async () => {
      const res = await request(app)
        .get('/api/v1/ml-v2/stats')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeDefined();
    });
  });

  describe('GET /api/v1/detection-events/:id/ml-v2', () => {
    it('should return 404 for non-existent detection event', async () => {
      const res = await request(app)
        .get('/api/v1/detection-events/non-existent-id/ml-v2')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(404);
    });
    
    // Additional tests for cross-tenant access...
  });
});
