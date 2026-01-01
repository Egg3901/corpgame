/**
 * Corporate Actions API Integration Tests
 * 
 * Tests marketing campaign and supply rush actions via corporate-actions endpoints
 * Validates CEO permissions, cost calculations, capital checks, and action lifecycle
 * 
 * Business Rules Tested:
 * - Only CEO can activate corporate actions
 * - Actions cost $500,000 + 1% of market capitalization
 * - Corporation must have sufficient capital
 * - Cannot activate if already active (4-hour expiry)
 * - Transactions recorded for audit trail
 * - Capital deducted from corporation on activation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST as MarketingPOST } from '@/app/api/corporate-actions/[corporationId]/marketing-campaign/route';
import { POST as SupplyRushPOST } from '@/app/api/corporate-actions/[corporationId]/supply-rush/route';
import { GET as GetActions } from '@/app/api/corporate-actions/[corporationId]/route';
import { GET as GetActiveActions } from '@/app/api/corporate-actions/[corporationId]/active/route';
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
  findCorporationByTicker,
} from '@/tests/utils/testHelpers';

describe('Corporate Actions API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'corporate_actions', 'transactions');
  });

  describe('POST /api/corporate-actions/[corporationId]/marketing-campaign', () => {
    describe('Successful Activation', () => {
      it('should activate marketing campaign with valid CEO and sufficient capital', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          shares: 1000000,
          share_price: 10.00,
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(response, 201);

        const body = await getResponseBody(response);
        expect(body.corporation_id).toBe(corporation.id);
        expect(body.action_type).toBe('marketing_campaign');
        expect(body.cost).toBeGreaterThan(500000);
        expect(body.expires_at).toBeDefined();
      });

      it('should calculate cost as $500k + 1% of market cap', async () => {
        const ceo = await createTestUser();
        // Market cap = 1,000,000 shares * $5.00 = $5,000,000
        // Expected cost = $500,000 + ($5,000,000 * 0.01) = $550,000
        const corporation = await createTestCorporation(ceo.id, {
          shares: 1000000,
          share_price: 5.00,
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const body = await getResponseBody(response);

        expect(body.cost).toBe(550000);
      });

      it('should deduct cost from corporation capital', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
          shares: 500000,
          share_price: 2.00,
        });
        
        const initialCapital = 1000000;
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const body = await getResponseBody(response);

        const updatedCorp = await findCorporationByTicker(corporation.ticker || corporation.name);
        expect(updatedCorp?.capital).toBe(initialCapital - body.cost);
      });

      it('should set expiry to 4 hours from now', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const beforeActivation = new Date();
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const body = await getResponseBody(response);

        const expiryTime = new Date(body.expires_at);
        const expectedExpiry = new Date(beforeActivation.getTime() + (4 * 60 * 60 * 1000));
        
        // Allow 1 minute tolerance for test execution time
        const timeDiff = Math.abs(expiryTime.getTime() - expectedExpiry.getTime());
        expect(timeDiff).toBeLessThan(60000);
      });

      it('should create transaction record', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });

        const { getDb } = await import('@/lib/db/mongo');
        const db = getDb();
        const transaction = await db.collection('transactions').findOne({
          transaction_type: 'corporate_action',
          corporation_id: corporation.id,
        });

        expect(transaction).toBeDefined();
        expect(transaction?.description).toContain('Marketing Campaign');
        expect(transaction?.amount).toBeLessThan(0); // Negative because it's a cost
      });
    });

    describe('Permission Checks', () => {
      it('should reject non-CEO activation', async () => {
        const ceo = await createTestUser();
        const otherUser = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
        });
        
        const token = createTestAccessToken(otherUser.id, otherUser.username, otherUser.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertErrorResponse(response, 403);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/only.*ceo.*activate/i);
      });

      it('should reject unauthenticated requests', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
        });
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertErrorResponse(response, 401);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/unauthorized/i);
      });
    });

    describe('Capital Checks', () => {
      it('should reject activation with insufficient capital', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 100000, // Not enough
          shares: 1000000,
          share_price: 10.00,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/insufficient capital/i);
        expect(body.required).toBeGreaterThan(body.available);
      });

      it('should provide required vs available capital in error', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 400000,
          shares: 1000000,
          share_price: 5.00,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const body = await getResponseBody(response);

        expect(body.required).toBe(550000);
        expect(body.available).toBe(400000);
      });

      it('should allow activation when capital exactly matches cost', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 550000,
          shares: 1000000,
          share_price: 5.00,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(response, 201);

        const updatedCorp = await findCorporationByTicker(corporation.ticker || corporation.name);
        expect(updatedCorp?.capital).toBe(0);
      });
    });

    describe('Active Action Checks', () => {
      it('should reject activation if marketing campaign already active', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 2000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        // Activate once
        await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });

        // Try to activate again
        const response2 = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertErrorResponse(response2, 400);

        const body = await getResponseBody(response2);
        expect(body.error).toMatch(/already active/i);
        expect(body.expiresAt).toBeDefined();
      });

      it('should provide expiry time when action already active', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 2000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const firstResponse = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const firstBody = await getResponseBody(firstResponse);

        const secondResponse = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        const secondBody = await getResponseBody(secondResponse);

        expect(secondBody.expiresAt).toBeDefined();
        expect(new Date(secondBody.expiresAt).getTime()).toBe(new Date(firstBody.expires_at).getTime());
      });
    });

    describe('Edge Cases', () => {
      it('should reject invalid corporation ID format', async () => {
        const ceo = await createTestUser();
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          'http://localhost:3000/api/corporate-actions/invalid/marketing-campaign',
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: 'invalid' } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/invalid.*corporation.*id/i);
      });

      it('should reject non-existent corporation', async () => {
        const ceo = await createTestUser();
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          'http://localhost:3000/api/corporate-actions/999999/marketing-campaign',
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: '999999' } });
        assertErrorResponse(response, 403); // API returns 403 for authorization before checking existence

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/ceo/i); // Matches "Only the CEO can activate corporate actions"
      });

      it('should handle high market cap corporations', async () => {
        const ceo = await createTestUser();
        // Market cap = 10,000,000 shares * $100 = $1,000,000,000
        // Cost = $500,000 + $10,000,000 = $10,500,000
        const corporation = await createTestCorporation(ceo.id, {
          shares: 10000000,
          share_price: 100.00,
          capital: 15000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(response, 201);

        const body = await getResponseBody(response);
        expect(body.cost).toBe(10500000);
      });

      it('should handle zero share price (penny stock)', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          shares: 1000000,
          share_price: 0.01,
          capital: 600000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(response, 201);

        const body = await getResponseBody(response);
        // Market cap = 1M * 0.01 = $10,000
        // Cost = $500,000 + $100 = $500,100
        expect(body.cost).toBe(500100);
      });
    });
  });

  describe('POST /api/corporate-actions/[corporationId]/supply-rush', () => {
    describe('Successful Activation', () => {
      it('should activate supply rush with valid CEO and sufficient capital', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          shares: 1000000,
          share_price: 10.00,
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await SupplyRushPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(response, 201);

        const body = await getResponseBody(response);
        expect(body.action_type).toBe('supply_rush');
        expect(body.cost).toBeGreaterThan(500000);
      });

      it('should use same cost formula as marketing campaign', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          shares: 1000000,
          share_price: 8.00,
          capital: 2000000,
        });
        
        // Expected cost = $500,000 + ($8,000,000 * 0.01) = $580,000
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const response = await SupplyRushPOST(request, { params: { corporationId: corporation.id.toString() } });
        const body = await getResponseBody(response);

        expect(body.cost).toBe(580000);
      });

      it('should create transaction with supply rush description', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 1000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        await SupplyRushPOST(request, { params: { corporationId: corporation.id.toString() } });

        const { getDb } = await import('@/lib/db/mongo');
        const db = getDb();
        const transaction = await db.collection('transactions').findOne({
          transaction_type: 'corporate_action',
          corporation_id: corporation.id,
        });

        expect(transaction?.description).toContain('Supply Rush');
      });
    });

    describe('Independent Action Lifecycle', () => {
      it('should allow both actions to be active simultaneously', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 3000000,
          shares: 1000000,
          share_price: 5.00,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const marketingRequest = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const supplyRequest = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const marketingResponse = await MarketingPOST(marketingRequest, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(marketingResponse, 201);

        const supplyResponse = await SupplyRushPOST(supplyRequest, { params: { corporationId: corporation.id.toString() } });
        assertSuccessResponse(supplyResponse, 201);

        const { getDb } = await import('@/lib/db/mongo');
        const db = getDb();
        const actionCount = await db.collection('corporate_actions').countDocuments({
          corporation_id: corporation.id,
        });

        expect(actionCount).toBe(2);
      });

      it('should deduct capital for both actions independently', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 3000000,
          shares: 1000000,
          share_price: 5.00,
        });
        
        const initialCapital = 3000000;
        const expectedCostPerAction = 550000;
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const marketingRequest = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        const supplyRequest = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        await MarketingPOST(marketingRequest, { params: { corporationId: corporation.id.toString() } });
        await SupplyRushPOST(supplyRequest, { params: { corporationId: corporation.id.toString() } });

        const updatedCorp = await findCorporationByTicker(corporation.ticker || corporation.name);
        expect(updatedCorp?.capital).toBe(initialCapital - (2 * expectedCostPerAction));
      });

      it('should prevent duplicate supply rush activation', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id, {
          capital: 2000000,
        });
        
        const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
          {
            method: 'POST',
            headers: authHeaders,
          }
        );

        await SupplyRushPOST(request, { params: { corporationId: corporation.id.toString() } });

        const response2 = await SupplyRushPOST(request, { params: { corporationId: corporation.id.toString() } });
        assertErrorResponse(response2, 400);

        const body = await getResponseBody(response2);
        expect(body.error).toMatch(/already active/i);
      });
    });
  });

  describe('GET /api/corporate-actions/[corporationId]', () => {
    it('should retrieve all corporate actions for corporation', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id, {
        capital: 3000000,
      });
      
      const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      // Activate both actions
      const marketingRequest = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      );

      const supplyRequest = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/supply-rush`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      );

      await MarketingPOST(marketingRequest, { params: { corporationId: corporation.id.toString() } });
      await SupplyRushPOST(supplyRequest, { params: { corporationId: corporation.id.toString() } });

      // Retrieve all actions
      const getRequest = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      const response = await GetActions(getRequest, { params: { corporationId: corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should return empty array for corporation with no actions', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id);
      
      const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      const response = await GetActions(request, { params: { corporationId: corporation.id.toString() } });
      const body = await getResponseBody(response);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it('should require authentication', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id);
      
      const request = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}`,
        {
          method: 'GET',
        }
      );

      const response = await GetActions(request, { params: { corporationId: corporation.id.toString() } });
      assertErrorResponse(response, 401);
    });
  });

  describe('GET /api/corporate-actions/[corporationId]/active', () => {
    it('should retrieve only active (non-expired) actions', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id, {
        capital: 3000000,
      });
      
      const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      // Activate marketing campaign
      const request = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/marketing-campaign`,
        {
          method: 'POST',
          headers: authHeaders,
        }
      );

      await MarketingPOST(request, { params: { corporationId: corporation.id.toString() } });

      // Get active actions
      const getRequest = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/active`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      const response = await GetActiveActions(getRequest, { params: { corporationId: corporation.id.toString() } });
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].action_type).toBe('marketing_campaign');
    });

    it('should not include expired actions', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id, {
        capital: 1000000,
      });
      
      const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      // Manually create expired action
      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // Expired 1 hour ago

      await db.collection('corporate_actions').insertOne({
        corporation_id: corporation.id,
        action_type: 'marketing_campaign',
        cost: 550000,
        expires_at: expiredDate,
        created_at: new Date(),
      });

      const request = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/active`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      const response = await GetActiveActions(request, { params: { corporationId: corporation.id.toString() } });
      const body = await getResponseBody(response);

      expect(body.length).toBe(0);
    });

    it('should return empty array if no active actions', async () => {
      const ceo = await createTestUser();
      const corporation = await createTestCorporation(ceo.id);
      
      const token = createTestAccessToken(ceo.id, ceo.username, ceo.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest(
        `http://localhost:3000/api/corporate-actions/${corporation.id}/active`,
        {
          method: 'GET',
          headers: authHeaders,
        }
      );

      const response = await GetActiveActions(request, { params: { corporationId: corporation.id.toString() } });
      const body = await getResponseBody(response);

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });
});
