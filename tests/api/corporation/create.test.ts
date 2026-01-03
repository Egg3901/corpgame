/**
 * Corporation Create API Integration Tests
 * 
 * Tests corporation creation via POST /api/corporation endpoint
 * Validates Zod schemas, ownership limits, and initial setup
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/corporation/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearCollections,
  createTestUser,
  createTestCorporation,
  createTestRequest,
  createAuthHeader,
  createTestAccessToken,
  getResponseBody,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
  findCorporationByTicker,
  getUserShares,
} from '@/tests/utils/testHelpers';

describe('POST /api/corporation', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'shareholders', 'transactions');
  });

  describe('Successful Corporation Creation', () => {
    it('should create corporation with valid data', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Test Corporation',
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 201);

      const body = await getResponseBody(response);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test Corporation');
      expect(body.type).toBe('Technology');
      expect(body.ceo_id).toBe(user.id);
    });

    it('should create corporation with default values', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Default Corp',
          sector: 'Energy',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      expect(body.shares).toBe(500000);
      expect(body.public_shares).toBe(100000);
      expect(body.share_price).toBe(1.00);
      expect(body.focus).toBe('diversified');
      
      const capital = typeof body.capital === 'string' 
        ? parseFloat(body.capital) 
        : body.capital;
      expect(capital).toBe(500000.00);
    });

    it('should create shareholder record for CEO with 400,000 shares', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Shareholder Test Corp',
          sector: 'Finance',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      const ceoShares = await getUserShares(user.id, body.id);
      expect(ceoShares).toBe(400000);
    });

    it('should create founding transaction record', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Transaction Test Corp',
          sector: 'Light Industry',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      const transaction = await db.collection('transactions').findOne({
        transaction_type: 'corp_founding',
        corporation_id: body.id,
        from_user_id: user.id,
      });

      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(500000);
      expect(transaction?.description).toContain('Founded');
      expect(transaction?.description).toContain(body.name);
    });

    it('should handle special characters in corporation name', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Smith & Johnson Co.',
          sector: 'Retail',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 201);

      const body = await getResponseBody(response);
      expect(body.name).toBe('Smith & Johnson Co.');
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject creation without name', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          sector: 'Technology',
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject name that is too short', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'AB',
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details[0].message).toMatch(/at least 3 characters/i);
    });

    it('should reject name that is too long', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'A'.repeat(101),
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details[0].message).toMatch(/not exceed 100 characters/i);
    });

    it('should reject name with invalid characters', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Corp@Name!',
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject creation without sector', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Test Corp',
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject empty sector', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Test Corp',
          sector: '',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });
  });

  describe('Ownership Limits', () => {
    it('should prevent creating second corporation as CEO', async () => {
      const user = await createTestUser();
      const existingCorp = await createTestCorporation(user.id);
      
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Second Corp',
          sector: 'Technology',          initial_capital: 500000,        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/only be CEO of one corporation/i);
      expect(body.existingCorporation).toBeDefined();
      expect(body.existingCorporation.id).toBe(existingCorp.id);
    });

    it('should provide existing corporation details in error', async () => {
      const user = await createTestUser();
      const existingCorp = await createTestCorporation(user.id, {
        name: 'First Corporation',
      });
      
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Attempt Corp',
          sector: 'Energy',          initial_capital: 500000,        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      expect(body.existingCorporation.name).toBe('First Corporation');
      expect(body.existingCorporation.id).toBe(existingCorp.id);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Test Corp',
          sector: 'Technology',
          initial_capital: 500000,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/unauthorized/i);
    });

    it('should reject invalid JWT token', async () => {
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Test Corp',
          sector: 'Technology',          initial_capital: 500000,        },
        headers: { 'Authorization': 'Bearer invalid.jwt.token' },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);
    });
  });

  describe('Edge Cases', () => {
    it('should trim whitespace from corporation name', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: '  Trimmed Corp  ',
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 201);

      const body = await getResponseBody(response);
      expect(body.name).toBe('Trimmed Corp');
    });

    it('should handle sector case variations', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Case Test Corp',
          sector: 'Technology',
          initial_capital: 500000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 201);

      const body = await getResponseBody(response);
      expect(body.type).toBe('Technology');
    });

    it('should handle database errors gracefully', async () => {
      const user = await createTestUser();
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      // Create with extremely long sector to trigger potential DB error
      const request = createTestRequest('http://localhost:3000/api/corporation', {
        method: 'POST',
        body: {
          name: 'Error Test Corp',
          sector: 'A'.repeat(51),
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });
  });
});
