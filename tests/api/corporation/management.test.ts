/**
 * Corporation Management API Integration Tests
 * 
 * Tests corporation GET/PATCH/DELETE via /api/corporation/[id] endpoint
 * Validates CEO permissions, updates, and data retrieval
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '@/app/api/corporation/[id]/route';
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
  findCorporationByTicker,
} from '@/tests/utils/testHelpers';

describe('Corporation Management API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'shareholders');
  });

  describe('GET /api/corporation/[id]', () => {
    describe('Successful Retrieval', () => {
      it('should retrieve corporation details', async () => {
        const scenario = await createTestScenario();
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${scenario.corporation.id}`,
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: scenario.corporation.id.toString() } });
        assertSuccessResponse(response, 200);

        const body = await getResponseBody(response);
        expect(body.id).toBe(scenario.corporation.id);
        expect(body.name).toBe(scenario.corporation.name);
        expect(body.ticker).toBe(scenario.corporation.ticker);
        expect(body.ceo_id).toBe(scenario.user.id);
      });

      it('should include CEO details', async () => {
        const scenario = await createTestScenario();
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${scenario.corporation.id}`,
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: scenario.corporation.id.toString() } });
        const body = await getResponseBody(response);

        expect(body.ceo).toBeDefined();
        expect(body.ceo.id).toBe(scenario.user.id);
        expect(body.ceo.username).toBe(scenario.user.username);
      });

      it('should include shareholders list', async () => {
        const scenario = await createTestScenario();
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${scenario.corporation.id}`,
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: scenario.corporation.id.toString() } });
        const body = await getResponseBody(response);

        expect(body.shareholders).toBeDefined();
        expect(Array.isArray(body.shareholders)).toBe(true);
        expect(body.shareholders.length).toBeGreaterThan(0);
      });

      it('should include user details with each shareholder', async () => {
        const scenario = await createTestScenario();
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${scenario.corporation.id}`,
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: scenario.corporation.id.toString() } });
        const body = await getResponseBody(response);

        const shareholder = body.shareholders[0];
        expect(shareholder.user).toBeDefined();
        expect(shareholder.user.username).toBeDefined();
        expect(shareholder.shares).toBeGreaterThan(0);
      });
    });

    describe('Error Cases', () => {
      it('should reject invalid corporation ID format', async () => {
        const request = createTestRequest(
          'http://localhost:3000/api/corporation/invalid',
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: 'invalid' } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/invalid.*corporation.*id/i);
      });

      it('should return 404 for non-existent corporation', async () => {
        const request = createTestRequest(
          'http://localhost:3000/api/corporation/999999',
          { method: 'GET' }
        );

        const response = await GET(request, { params: { id: '999999' } });
        assertErrorResponse(response, 404);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/corporation not found/i);
      });
    });
  });

  describe('PATCH /api/corporation/[id]', () => {
    describe('Successful Updates', () => {
      it('should allow CEO to update corporation name', async () => {
        const user = await createTestUser({ actions: 100 });
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Updated Corporation Name' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertSuccessResponse(response, 200);

        const body = await getResponseBody(response);
        expect(body.name).toBe('Updated Corporation Name');
      });

      it('should allow CEO to update sector/type', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { type: 'Energy' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertSuccessResponse(response, 200);

        const body = await getResponseBody(response);
        expect(body.type).toBe('Energy');
      });

      it('should allow CEO to update focus', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { focus: 'production' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertSuccessResponse(response, 200);

        const body = await getResponseBody(response);
        expect(body.focus).toBe('production');
      });

      it('should deduct actions for name change', async () => {
        const user = await createTestUser({ actions: 50 });
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Name Change Corp' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertSuccessResponse(response, 200);

        const { UserModel } = await import('@/lib/models/User');
        const currentActions = await UserModel.getActions(user.id);
        expect(currentActions).toBeLessThan(50);
      });

      it('should allow admin to bypass action costs', async () => {
        const user = await createTestUser({ is_admin: true, actions: 0 });
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'admin');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Admin Name Change' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertSuccessResponse(response, 200);
      });
    });

    describe('Validation Errors', () => {
      it('should reject name that is too short', async () => {
        const user = await createTestUser({ actions: 100 });
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'AB' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        assertValidationError(body);
      });

      it('should reject invalid sector', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { type: 'InvalidSector' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/invalid sector/i);
        expect(body.valid_sectors).toBeDefined();
      });

      it('should reject invalid focus type', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { focus: 'invalid_focus' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/invalid focus/i);
      });
    });

    describe('Permissions', () => {
      it('should reject non-CEO updates', async () => {
        const ceo = await createTestUser();
        const otherUser = await createTestUser();
        const corporation = await createTestCorporation(ceo.id);
        
        const token = createTestAccessToken(otherUser.id, otherUser.username, otherUser.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Unauthorized Change' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 403);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/only.*ceo.*update/i);
      });

      it('should reject insufficient actions for name change', async () => {
        const user = await createTestUser({ actions: 0 });
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Expensive Name Change' },
            headers: authHeaders,
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 400);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/requires.*actions/i);
        expect(body.actions_required).toBeDefined();
        expect(body.actions_available).toBe(0);
      });

      it('should reject unauthenticated requests', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'PATCH',
            body: { name: 'Unauthorized' },
          }
        );

        const response = await PATCH(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 401);
      });
    });
  });

  describe('DELETE /api/corporation/[id]', () => {
    describe('Successful Deletion', () => {
      it('should allow CEO to delete corporation', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'DELETE',
            headers: authHeaders,
          }
        );

        const response = await DELETE(request, { params: { id: corporation.id.toString() } });
        expect(response.status).toBe(204);
      });

      it('should remove corporation from database', async () => {
        const user = await createTestUser();
        const corporation = await createTestCorporation(user.id);
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'DELETE',
            headers: authHeaders,
          }
        );

        await DELETE(request, { params: { id: corporation.id.toString() } });

        const deletedCorp = await findCorporationByTicker(corporation.ticker || corporation.name);
        expect(deletedCorp).toBeNull();
      });
    });

    describe('Permissions', () => {
      it('should reject non-CEO deletion', async () => {
        const ceo = await createTestUser();
        const otherUser = await createTestUser();
        const corporation = await createTestCorporation(ceo.id);
        
        const token = createTestAccessToken(otherUser.id, otherUser.username, otherUser.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          {
            method: 'DELETE',
            headers: authHeaders,
          }
        );

        const response = await DELETE(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 403);

        const body = await getResponseBody(response);
        expect(body.error).toMatch(/only.*ceo.*delete/i);
      });

      it('should reject unauthenticated deletion', async () => {
        const ceo = await createTestUser();
        const corporation = await createTestCorporation(ceo.id);
        
        const request = createTestRequest(
          `http://localhost:3000/api/corporation/${corporation.id}`,
          { method: 'DELETE' }
        );

        const response = await DELETE(request, { params: { id: corporation.id.toString() } });
        assertErrorResponse(response, 401);
      });
    });

    describe('Error Cases', () => {
      it('should reject invalid corporation ID', async () => {
        const user = await createTestUser();
        const token = createTestAccessToken(user.id, user.username, user.email, 'user');
        const authHeaders = createAuthHeader(token);
        
        const request = createTestRequest(
          'http://localhost:3000/api/corporation/invalid',
          {
            method: 'DELETE',
            headers: authHeaders,
          }
        );

        const response = await DELETE(request, { params: { id: 'invalid' } });
        assertErrorResponse(response, 400);
      });
    });
  });
});
