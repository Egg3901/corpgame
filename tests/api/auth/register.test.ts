/**
 * Register API Integration Tests
 * 
 * Tests user registration via POST /api/auth/register endpoint
 * Validates Zod schemas, duplicate detection, and successful registration flows
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
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
  findUserByUsername,
  findCorporationByTicker,
  generateUsername,
  generateEmail,
  generatePassword,
} from '@/tests/utils/testHelpers';

describe('POST /api/auth/register', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearCollections('users', 'corporations', 'banned_ips');
  });

  describe('Successful Registration', () => {
    it('should register new user with valid data', async () => {
      const username = generateUsername();
      const email = generateEmail();
      
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username,
          email,
          password: 'ValidPass123!',
          player_name: 'Test Player',
          gender: 'm',
          age: 25,
          starting_state: 'NY',
        },
      });

      const response = await POST(request);

      const body = await getResponseBody(response);
      expect(response.status).toBe(201);
      expect(body.user).toBeDefined();
      expect(body.user.username).toBe(username);
      expect(body.user.email).toBe(email);
      expect(body.token).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('should create user in database', async () => {
      const username = generateUsername();
      
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username,
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test Player',
          gender: 'f',
          age: 30,
          starting_state: 'CA',
        },
      });

      await POST(request);

      const user = await findUserByUsername(username);
      expect(user).toBeDefined();
      expect(user?.username).toBe(username);
      expect(user?.password_hash).toBeDefined();
      expect(user?.password_hash).not.toContain('ValidPass123!'); // Password should be hashed
    });

    it('should auto-create corporation for new user', async () => {
      const username = generateUsername();
      
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username,
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Corp Owner',
          gender: 'nonbinary',
          age: 28,
          starting_state: 'TX',
        },
      });

      const response = await POST(request);
      const body = await getResponseBody(response);

      // Check that corporation was created
      const user = await findUserByUsername(username);
      expect(user).toBeDefined();

      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      const corporation = await db.collection('corporations').findOne({ ceo: user?._id });
      expect(corporation).toBeDefined();
    });

    it('should return JWT tokens on successful registration', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Token Test',
          gender: 'm',
          age: 35,
          starting_state: 'FL',
        },
      });

      const response = await POST(request);

      const body = await getResponseBody(response);
      expect(response.status).toBe(201);

      expect(body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(body.refreshToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(body.token).not.toBe(body.refreshToken);
    });
  });

  describe('Validation Errors (Zod)', () => {
    it('should reject registration without username', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject registration without email', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject invalid email format', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: 'invalid-email',
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
      expect(body.details[0].message).toMatch(/email/i);
    });

    it('should reject weak password', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'weak',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject username that is too short', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: 'ab',
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      assertValidationError(body);
    });

    it('should reject invalid age', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 10, // Too young
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });

    it('should reject invalid gender', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'invalid',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });
  });

  describe('Duplicate Detection', () => {
    it('should reject duplicate email', async () => {
      const email = generateEmail();
      
      await createTestUser({ email });

      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email, // Same email
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/email.*exists|already/i);
    });

    it('should reject duplicate username', async () => {
      const username = generateUsername();
      
      await createTestUser({ username });

      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username, // Same username
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/username.*taken|already/i);
    });

    it('should handle case-insensitive duplicate detection', async () => {
      await createTestUser({ username: 'TestUser' });

      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: 'testuser', // Different case
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });
  });

  describe('IP Banning', () => {
    it('should reject registration from banned IP', async () => {
      const { getDb } = await import('@/lib/db/mongo');
      const db = getDb();
      await db.collection('banned_ips').insertOne({
        ip_address: '192.168.1.100', // Banned IP (field must match BannedIpModel schema)
        reason: 'Test ban',
        created_at: new Date(),
      });

      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
        headers: {
          'x-forwarded-for': '192.168.1.100', // Match the banned IP
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 403);

      const body = await getResponseBody(response);
      expect(body.error).toMatch(/banned|blocked/i);
    });
  });

  describe('Edge Cases', () => {
    it('should trim whitespace from username and email', async () => {
      const username = generateUsername();
      const email = generateEmail();
      
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: `  ${username}  `,
          email: `  ${email}  `,
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const user = await findUserByUsername(username);
      expect(user?.username).toBe(username);
      expect(user?.email).toBe(email);
    });

    it('should handle special characters in player_name', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: generateUsername(),
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: "O'Neil-Smith Jr.",
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);

      const body = await getResponseBody(response);
      expect(response.status).toBe(201);

      expect(body.user.player_name).toBe("O'Neil-Smith Jr.");
    });

    it('should reject NoSQL injection in username', async () => {
      const request = createTestRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: {
          username: { $ne: null },
          email: generateEmail(),
          password: 'ValidPass123!',
          player_name: 'Test',
          gender: 'm',
          age: 25,
        },
      });

      const response = await POST(request);
      assertErrorResponse(response, 400);
    });
  });
});
