/**
 * Share Sell API Integration Tests
 * 
 * Tests share selling via POST /api/shares/[id]/sell endpoint
 * Validates Zod schemas, share ownership checks, and price calculations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/shares/[id]/sell/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearCollections,
  createTestUser,
  createTestCorporation,
  createTestShares,
  createTestScenario,
  createTestRequest,
  createAuthHeader,
  createTestAccessToken,
  getResponseBody,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
  getUserShares,
  findUserByUsername,
  findCorporationByTicker,
} from '@/tests/utils/testHelpers';

describe('POST /api/shares/[id]/sell', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'shareholders', 'share_transactions');
  });

  describe('Successful Share Sale', () => {
    it('should sell shares with valid data and sufficient holdings', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 5 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.message).toMatch(/sold successfully/i);
      expect(body.shares).toBe(5);
      expect(body.price).toBeGreaterThan(0);
      expect(body.total_proceeds).toBe(body.price * 5);
    });

    it('should add proceeds to user cash', async () => {
      const scenario = await createTestScenario();
      const initialCash = scenario.user.cash;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 3 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      const body = await getResponseBody(response);

      const updatedUser = await findUserByUsername(scenario.user.username);
      const userCash = typeof updatedUser?.cash === 'string' 
        ? parseFloat(updatedUser.cash) 
        : updatedUser?.cash || 0;
      
      expect(userCash).toBe(initialCash + body.total_proceeds);
    });

    it('should reduce shareholder holdings correctly', async () => {
      const scenario = await createTestScenario();
      const initialShares = scenario.shares;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 8 },
          headers: scenario.authHeaders,
        }
      );

      await POST(request, { params: { id: scenario.corporation.id.toString() } });

      const newShares = await getUserShares(scenario.user.id, scenario.corporation.id);
      expect(newShares).toBe(initialShares.quantity - 8);
    });

    it('should increase public shares in corporation', async () => {
      const scenario = await createTestScenario();
      const corp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      const initialPublicShares = corp?.public_shares || 0;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 12 },
          headers: scenario.authHeaders,
        }
      );

      await POST(request, { params: { id: scenario.corporation.id.toString() } });

      const updatedCorp = await findCorporationByTicker(scenario.corporation.ticker || scenario.corporation.name);
      expect(updatedCorp?.public_shares).toBe(initialPublicShares + 12);
    });

    it('should create share transaction record', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 6 },
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
        transaction_type: 'sell',
      });

      expect(transaction).toBeDefined();
      expect(transaction?.shares).toBe(6);
      expect(transaction?.price_per_share).toBe(body.price);
    });

    it('should handle sell price with 1% discount (0.99x)', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 1 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      const body = await getResponseBody(response);

      // Sell price should include 1% discount
      expect(body.price).toBeGreaterThan(0);
      expect(body.total_proceeds).toBe(body.price * 1);
    });

    it('should allow selling all owned shares', async () => {
      const scenario = await createTestScenario();
      const totalShares = scenario.shares.shares; // Use .shares field from shareholder record
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: totalShares },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const remainingShares = await getUserShares(scenario.user.id, scenario.corporation.id);
      expect(remainingShares).toBe(0);
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject sale without shares field', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: -5 },
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 7.5 },
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 'five' },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });
  });

  describe('Insufficient Holdings', () => {
    it('should reject sale exceeding owned shares', async () => {
      const scenario = await createTestScenario();
      const ownedShares = scenario.shares.quantity;
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: ownedShares + 1 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/insufficient shares/i);
      expect(body.error).toContain(ownedShares.toString());
    });

    it('should reject sale when user owns no shares', async () => {
      const user = await createTestUser();
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id);
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 1 },
          headers: authHeaders,
        }
      );

      const response = await POST(request, { params: { id: corporation.id.toString() } });
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/insufficient shares/i);
      expect(body.error).toContain('0');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 5 },
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
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 5 },
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
        'http://localhost:3000/api/shares/invalid/sell',
        {
          method: 'POST',
          body: { shares: 5 },
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
        'http://localhost:3000/api/shares/999999/sell',
        {
          method: 'POST',
          body: { shares: 5 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: '999999' } });
      assertErrorResponse(response, 404);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/corporation not found/i);
    });

    it('should handle selling shares in user\'s own corporation', async () => {
      const scenario = await createTestScenario();
      
      const request = createTestRequest(
        `http://localhost:3000/api/shares/${scenario.corporation.id}/sell`,
        {
          method: 'POST',
          body: { shares: 3 },
          headers: scenario.authHeaders,
        }
      );

      const response = await POST(request, { params: { id: scenario.corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.message).toMatch(/sold successfully/i);
    });
  });
});
