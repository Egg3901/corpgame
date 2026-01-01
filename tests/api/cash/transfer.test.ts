/**
 * Cash Transfer API Integration Tests
 * 
 * Tests user-to-user cash transfers via POST /api/cash/transfer
 * Validates Zod schemas, balance checks, and transaction recording
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/cash/transfer/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearCollections,
  createTestUser,
  createTestRequest,
  createAuthHeader,
  createTestAccessToken,
  getResponseBody,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
} from '@/tests/utils/testHelpers';

describe('POST /api/cash/transfer', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'transactions');
  });

  describe('Successful Transfers', () => {
    it('should transfer cash between users', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser({ cash: 10000 });
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
          description: 'Test transfer',
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.success).toBe(true);
      expect(body.amount).toBe(5000);
      expect(body.sender_new_balance).toBe(45000);
      expect(body.recipient_new_balance).toBe(15000);
      expect(body.note).toBe('Test transfer');
    });

    it('should transfer without description', async () => {
      const sender = await createTestUser({ cash: 30000 });
      const recipient = await createTestUser({ cash: 5000 });
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 2500,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.note).toBeNull();
    });

    it('should update sender balance correctly', async () => {
      const sender = await createTestUser({ cash: 100000 });
      const recipient = await createTestUser();
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 25000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      const { UserModel } = await import('@/lib/models/User');
      const senderCash = await UserModel.getCash(sender.id);
      expect(senderCash).toBe(75000);
      expect(body.sender_new_balance).toBe(75000);
    });

    it('should update recipient balance correctly', async () => {
      const sender = await createTestUser({ cash: 60000 });
      const recipient = await createTestUser({ cash: 20000 });
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 15000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      const { UserModel } = await import('@/lib/models/User');
      const recipientCash = await UserModel.getCash(recipient.id);
      expect(recipientCash).toBe(35000);
      expect(body.recipient_new_balance).toBe(35000);
    });

    it('should record transaction in database', async () => {
      const sender = await createTestUser({ cash: 40000 });
      const recipient = await createTestUser();
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 8000,
          description: 'Payment for services',
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      const transaction = await db.collection('transactions').findOne({
        transaction_type: 'user_transfer',
        from_user_id: sender.id,
        to_user_id: recipient.id,
        amount: 8000,
      });

      expect(transaction).toBeDefined();
      expect(transaction?.description).toContain('Payment for services');
    });

    it('should handle transfer of entire balance', async () => {
      const sender = await createTestUser({ cash: 10000 });
      const recipient = await createTestUser();
      
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 10000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.sender_new_balance).toBe(0);
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject transfer without toUserId', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject transfer without amount', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject negative amounts', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: -5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject zero amounts', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 0,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject invalid toUserId type', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: 'invalid',
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });
  });

  describe('Business Logic Errors', () => {
    it('should reject self-transfer', async () => {
      const user = await createTestUser({ cash: 50000 });
      const token = createTestAccessToken(user.id, user.username, user.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: user.id,
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/cannot transfer.*yourself/i);
    });

    it('should reject transfer to non-existent user', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: 999999,
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 404);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/recipient not found/i);
    });

    it('should reject transfer with insufficient funds', async () => {
      const sender = await createTestUser({ cash: 1000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/insufficient funds/i);
    });

    it('should provide clear insufficient funds message with balances', async () => {
      const sender = await createTestUser({ cash: 2500 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 10000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      expect(body.error).toContain('2,500');
      expect(body.error).toContain('10,000');
    });
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const recipient = await createTestUser();
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/unauthorized/i);
    });

    it('should reject invalid JWT token', async () => {
      const recipient = await createTestUser();
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
        },
        headers: { 'Authorization': 'Bearer invalid.jwt.token' },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle large transfer amounts', async () => {
      const sender = await createTestUser({ cash: 10000000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000000,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.amount).toBe(5000000);
    });

    it('should handle small transfer amounts', async () => {
      const sender = await createTestUser({ cash: 1000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 1,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.amount).toBe(1);
    });

    it('should handle long descriptions', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser();
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      const longDescription = 'A'.repeat(200);
      
      const request = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
          description: longDescription,
        },
        headers: authHeaders,
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.note).toBe(longDescription);
    });

    it('should handle multiple transfers in sequence', async () => {
      const sender = await createTestUser({ cash: 50000 });
      const recipient = await createTestUser({ cash: 0 });
      const token = createTestAccessToken(sender.id, sender.username, sender.email, 'user');
      const authHeaders = createAuthHeader(token);
      
      // First transfer
      const request1 = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 10000,
        },
        headers: authHeaders,
      });

      await POST(request1);

      // Second transfer
      const request2 = createTestRequest('http://localhost:3000/api/cash/transfer', {
        method: 'POST',
        body: {
          toUserId: recipient.id,
          amount: 5000,
        },
        headers: authHeaders,
      });

      const response = await POST(request2);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.sender_new_balance).toBe(35000);
      expect(body.recipient_new_balance).toBe(15000);
    });
  });
});
