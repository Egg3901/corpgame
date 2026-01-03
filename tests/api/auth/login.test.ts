/**
 * Login API Integration Tests
 * 
 * Tests authentication via POST /api/auth/login endpoint
 * Validates Zod schemas, error handling, and successful login flows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearCollections,
  createTestUser,
  createTestRequest,
  getResponseBody,
  assertSuccessResponse,
  assertErrorResponse,
  assertValidationError,
} from '@/tests/utils/testHelpers';

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'banned_ips');
  });

  describe('Successful Login', () => {
    it('should login successfully with valid username and password', async () => {
      const testUser = await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.username).toBe('testuser');
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.password_hash).toBeUndefined(); // Should not expose password hash
    });

    it('should login successfully with email and password', async () => {
      const testUser = await createTestUser({
        username: 'emailuser',
        email: 'email@example.com',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'email@example.com',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.user.email).toBe('email@example.com');
    });

    it('should return valid JWT tokens', async () => {
      const testUser = await createTestUser({
        username: 'jwtuser',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'jwtuser',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      // JWT tokens should be strings with 3 parts separated by dots
      expect(body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(body.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(body.token).not.toBe(body.refreshToken);
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject login without username or email', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('username'),
          }),
        ])
      );
    });

    it('should reject login without password', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject empty username', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: '',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject empty password', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
          password: '',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject malformed request body', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          invalid_field: 'test',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });
  });

  describe('Authentication Errors', () => {
    it('should reject non-existent username', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'nonexistent',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/invalid|credentials/i);
    });

    it('should reject incorrect password', async () => {
      await createTestUser({
        username: 'testuser',
        password: 'CorrectPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'WrongPass123!',
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 401);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/invalid|credentials|password/i);
    });

    it('should reject login from banned IP', async () => {
      const testUser = await createTestUser({
        username: 'testuser',
        password: 'ValidPass123!',
      });

      // Ban a specific test IP
      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      await db.collection('banned_ips').insertOne({
        ip_address: '192.168.1.101', // Banned IP (field must match BannedIpModel schema)
        reason: 'Test ban',
        created_at: new Date(),
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser',
          password: 'ValidPass123!',
        },
        headers: {
          'x-forwarded-for': '192.168.1.101', // Match the banned IP
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 403);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/banned|blocked/i);
    });
  });

  describe('Case Sensitivity', () => {
    it('should handle username case-insensitively', async () => {
      await createTestUser({
        username: 'TestUser',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: 'testuser', // lowercase
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);

      const body = await getResponseBody(response);
      expect(body.user).toBeDefined();
      expect(body.token).toBeDefined();
    });

    it('should handle email case-insensitively', async () => {
      await createTestUser({
        email: 'Test@Example.COM',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          email: 'test@example.com', // lowercase
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);
    });
  });

  describe('Edge Cases', () => {
    it('should handle trimmed whitespace in username', async () => {
      await createTestUser({
        username: 'testuser',
        password: 'ValidPass123!',
      });

      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: '  testuser  ',
          password: 'ValidPass123!',
        },
      });

      const response = await POST(request);
      assertSuccessResponse(response, 200);
    });

    it('should reject SQL injection attempts', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: "admin' OR '1'='1",
          password: "' OR '1'='1",
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });

    it('should reject NoSQL injection attempts', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: {
          username: { $ne: null },
          password: { $ne: null },
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });
  });
});
