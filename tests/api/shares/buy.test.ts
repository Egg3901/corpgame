/**
 * Share Buy API Integration Tests
 * 
 * Tests share purchasing via POST /api/shares/[id]/buy endpoint
 * Validates Zod schemas, cash checks, share availability, and price calculations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/shares/[id]/buy/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearCollections,
  createTestUser,
  createTestCorporation,
  createTestScenario,
  createTestRequest,
  createAuthHeader,
  getResponseBody,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
  getUserShares,
  findUserByUsername,
  findCorporationByTicker,
} from '@/tests/utils/testHelpers';

describe('POST /api/shares/[id]/buy', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'shareholders', 'share_transactions', 'transactions', 'share_price_history');
  });

  describe('Successful Share Purchase', () => {
    it('should buy shares with valid data and sufficient funds', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 10 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.success).toBe(true);
      expect(body.shares).toBe(10);
      expect(body.price_per_share).toBeGreaterThan(0);
      expect(body.total_cost).toBe(body.price_per_share * 10);
      expect(body.new_share_price).toBeDefined();
    });

    it('should deduct correct amount from user cash', async () => {
      const scenario = await createTestScenario();
      const initialCash = scenario.user.cash || 0;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 5 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      const body = await getResponseBody(response);

      const updatedUser = await findUserByUsername(scenario.user.username);
      const userCash = typeof updatedUser?.cash === 'string' 
        ? parseFloat(updatedUser.cash) 
        : updatedUser?.cash || 0;
      
      expect(userCash).toBe(initialCash - body.total_cost);
    });

    it('should update shareholder record correctly', async () => {
      const scenario = await createTestScenario();
      const initialShares = scenario.shares;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 15 },
          headers: scenario.authHeaders,
        }
      );

      await POST(request, { params: { id: scenario.corporation.id.toString() } });

      const newShares = await getUserShares(scenario.user.id, scenario.corporation.id);
      expect(newShares).toBe(initialShares.quantity + 15);
    });

    it('should reduce public shares in corporation', async () => {
      const scenario = await createTestScenario();
      const corp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      const initialPublicShares = corp?.public_shares || 0;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 20 },
          headers: scenario.authHeaders,
        }
      );

      await POST(request, { params: { id: scenario.corporation.id.toString() } });

      const updatedCorp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      expect(updatedCorp?.public_shares).toBe(initialPublicShares - 20);
    });

    it('should create share transaction record', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 8 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      const body = await getResponseBody(response);

      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      const transaction = await db.collection('share_transactions').findOne({
        corporation_id: scenario.corporation.id,
        user_id: scenario.user.id,
        transaction_type: 'buy',
      });

      expect(transaction).toBeDefined();
      expect(transaction?.shares).toBe(8);
      expect(transaction?.price_per_share).toBe(body.price_per_share);
    });

    it('should handle buy price with 1% premium (1.01x)', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 1 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      const body = await getResponseBody(response);

      // Buy price should include 1% premium
      expect(body.price_per_share).toBeGreaterThan(0);
      expect(body.total_cost).toBe(body.price_per_share * 1);
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject purchase without shares field', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: {},
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject negative shares', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: -10 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details[0].message).toMatch(/positive/i);
    });

    it('should reject zero shares', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 0 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject fractional shares', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 10.5 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details[0].message).toMatch(/whole number/i);
    });

    it('should reject shares exceeding maximum limit', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 1000001 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject non-numeric shares', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 'ten' },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });
  });

  describe('Insufficient Funds', () => {
    it('should reject purchase with insufficient cash', async () => {
      const user = await createTestUser({ cash: 1 });
      const corporation = await createTestCorporation(user.id);
      const { createTestAccessToken } = await import('@/tests/utils/testHelpers');
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 100 },
          headers: authHeaders,
        }
      );

      const response = await POST(request, { params: { id: corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/insufficient funds/i);
    });

    it('should provide helpful error message with required amount', async () => {
      const user = await createTestUser({ cash: 1 });
      const corporation = await createTestCorporation(user.id);
      const { createTestAccessToken } = await import('@/tests/utils/testHelpers');
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 50 },
          headers: authHeaders,
        }
      );

      const response = await POST(request, { params: { id: corporation.id.toString() } });
      const body = await getResponseBody(response);

      expect(body.error).toContain('$');
      expect(body.error).toMatch(/have.*need/i);
    });
  });

  describe('Share Availability', () => {
    it('should reject purchase exceeding available public shares', async () => {
      const scenario = await createTestScenario();
      const corp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      const availableShares = corp?.public_shares || 0;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: availableShares + 1 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/public shares available/i);
      expect(body.error).toContain(availableShares.toString());
    });

    it('should allow purchase of all remaining public shares', async () => {
      const scenario = await createTestScenario();
      const corp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      const availableShares = corp?.public_shares || 0;
      
      // Give user enough cash (much more to handle any price)
      const { UserModel } = await import('@/lib/models/User');
      await UserModel.updateCash(scenario.user.id, 100000000);
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: availableShares },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const updatedCorp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      expect(updatedCorp?.public_shares).toBe(0);
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 10 },
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 401);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/unauthorized/i);
    });

    it('should reject invalid JWT token', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 10 },
          headers: { 'Authorization': 'Bearer invalid.jwt.token' },
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 401);
    });
  });

  describe('Edge Cases', () => {
    it('should reject invalid corporation ID format', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        'http://localhost:3000/api/shares/invalid/buy',
        {
          method: 'POST',
          body: { shares: 10 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: 'invalid' } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/invalid.*corporation.*id/i);
    });

    it('should reject non-existent corporation', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        'http://localhost:3000/api/shares/999999/buy',
        {
          method: 'POST',
          body: { shares: 10 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: '999999' } });
      assertErrorResponse(response, 404);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/corporation not found/i);
    });

    it('should handle buying shares in user\'s own corporation', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/buy`,
        {
          method: 'POST',
          body: { shares: 5 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.success).toBe(true);
    });
  });
});
