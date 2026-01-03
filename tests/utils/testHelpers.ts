/**
 * Test Helpers - Shared utilities for integration testing
 * 
 * Provides database setup/teardown, mock factories, and test data generators
 * for comprehensive API route testing.
 * 
 * @module tests/utils/testHelpers
 */

import { NextRequest } from 'next/server';
import { connectMongo, getDb, getNextId } from '@/lib/db/mongo';
import { signAccessToken } from '@/lib/auth/jwt';
import { UserModel, User, UserInput } from '@/lib/models/User';
import { CorporationModel, Corporation, CreateCorporationData } from '@/lib/models/Corporation';

/**
 * Database Test Utilities
 */

/**
 * Sets up a clean test database connection
 * Connects to MongoDB and clears relevant collections
 */
export async function setupTestDatabase(): Promise<void> {
  await connectMongo();
  const db = getDb();
  
  // Clear test collections (preserve system collections)
  const collections = await db.listCollections().toArray();
  for (const collection of collections) {
    const name = collection.name;
    if (!name.startsWith('system.')) {
      await db.collection(name).deleteMany({});
    }
  }
}

/**
 * Tears down test database after tests complete
 * Optionally drops the entire test database
 */
export async function teardownTestDatabase(dropDatabase = false): Promise<void> {
  if (dropDatabase) {
    const db = getDb();
    await db.dropDatabase();
  }
}

/**
 * Clears specific collections for isolated test scenarios
 */
export async function clearCollections(...collectionNames: string[]): Promise<void> {
  const db = getDb();
  for (const name of collectionNames) {
    await db.collection(name).deleteMany({});
  }
}

/**
 * Mock Data Factories
 */

/**
 * Creates a test user using UserModel.create()
 * Returns User with proper numeric id (not ObjectId)
 * 
 * @param overrides - Partial user data to override defaults
 * @returns Created User from UserModel with numeric id and plain password for testing
 */
export async function createTestUser(overrides: Partial<{
  username: string;
  email: string;
  password: string;
  cash: number;
  actions: number;
  player_name: string;
  gender: 'm' | 'f' | 'nonbinary';
  age: number;
  starting_state: string;
  is_admin: boolean;
}> = {}): Promise<User & { password: string }> {
  const defaultPassword = 'TestPass123!';
  const password = overrides.password || defaultPassword;
  
  const userInput: UserInput = {
    username: overrides.username || `testuser_${Date.now()}`,
    email: overrides.email || `test_${Date.now()}@example.com`,
    password,
    player_name: overrides.player_name,
    gender: overrides.gender,
    age: overrides.age,
    starting_state: overrides.starting_state,
    is_admin: overrides.is_admin,
  };
  
  const user = await UserModel.create(userInput);
  
  // Set custom cash if specified (default is 500000 from UserModel.create)
  if (overrides.cash !== undefined && overrides.cash !== 500000) {
    await UserModel.updateCash(user.id, overrides.cash - 500000);
    user.cash = overrides.cash;
  }
  
  // Set custom actions if specified (default is 20 from UserModel.create)
  if (overrides.actions !== undefined && overrides.actions !== 20) {
    await UserModel.updateActions(user.id, overrides.actions - 20);
    user.actions = overrides.actions;
  }
  
  return {
    ...user,
    password, // Return plain password for test assertions
  };
}

/**
 * Creates a test corporation using CorporationModel.create()
 * Returns Corporation with proper numeric id
 * 
 * @param ceoUserId - Numeric ID of the CEO user
 * @param overrides - Partial corporation data to override defaults
 * @returns Created Corporation from CorporationModel
 */
export async function createTestCorporation(
  ceoUserId: number,
  overrides: Partial<{
    name: string;
    ticker: string;
    logo: string | null;
    shares: number;
    public_shares: number;
    share_price: number;
    capital: number;
    type: string | null;
    focus: 'extraction' | 'production' | 'retail' | 'service' | 'diversified';
  }> = {}
): Promise<Corporation & { ticker?: string }> {
  const corpData: CreateCorporationData = {
    ceo_id: ceoUserId,
    name: overrides.name || `TestCorp_${Date.now()}`,
    logo: overrides.logo,
    shares: overrides.shares,
    public_shares: overrides.public_shares,
    share_price: overrides.share_price,
    capital: overrides.capital,
    type: overrides.type,
    focus: overrides.focus,
  };
  
  const corp = await CorporationModel.create(corpData);
  
  return {
    ...corp,
    ticker: overrides.ticker, // Add ticker for backward compatibility with tests
  };
}

/**
 * Creates test shares (ownership) in the database
 * Uses numeric IDs to match actual model architecture
 * 
 * @param userId - Numeric ID of the shareholder
 * @param corporationId - Numeric ID of the corporation
 * @param quantity - Number of shares owned
 * @returns Created shareholding document with numeric IDs
 */
export async function createTestShares(
  userId: number,
  corporationId: number,
  quantity: number
) {
  const db = getDb();
  
  // Create shareholder record in shareholders collection
  const id = await getNextId('shareholders_id');
  const shareholderData = {
    id,
    user_id: userId,
    corporation_id: corporationId,
    shares: quantity,
    purchased_at: new Date(),
  };
  
  await db.collection('shareholders').insertOne(shareholderData);
  
  return { ...shareholderData, quantity }; // Return with quantity for backward compatibility
}

/**
 * Finds corporation by ticker (for test assertions)
 * 
 * @param ticker - Corporation ticker symbol
 * @returns Corporation if found, null otherwise
 */
export async function findCorporationByTicker(ticker: string): Promise<Corporation | null> {
  return await getDb().collection<Corporation>('corporations').findOne({ name: ticker });
}

/**
 * Authentication Helpers
 */

/**
 * Creates a valid JWT access token for testing authenticated routes
 * Uses numeric userId to match actual model architecture
 * 
 * @param userId - Numeric ID of the user
 * @param username - Username of the user
 * @param email - Email of the user
 * @param role - Role of the user (default: 'user')
 * @returns JWT access token string
 */
export function createTestAccessToken(
  userId: number,
  username: string,
  email: string,
  role = 'user'
): string {
  return signAccessToken({
    userId,
    username,
    email,
    role,
  });
}

/**
 * Creates authorization header for authenticated requests
 * 
 * @param token - JWT access token
 * @returns Authorization header object
 */
export function createAuthHeader(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Request Helpers
 */

/**
 * Creates a proper NextRequest mock for testing API routes
 * Includes all required NextRequest properties for type safety
 * 
 * @param url - Full URL for the request
 * @param options - Request options (method, body, headers)
 * @returns NextRequest-compatible object
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const requestOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Set default x-forwarded-for header for IP detection (127.0.0.1 = localhost, not banned by default)
      // Tests that need specific IPs can override this via options.headers
      'x-forwarded-for': '127.0.0.1',
      ...options.headers,
    },
  };
  
  if (options.body) {
    requestOptions.body = JSON.stringify(options.body);
  }
  
  // Create base Request first
  const baseRequest = new Request(url, requestOptions);
  
  // Cast to NextRequest with required properties
  const nextRequest = baseRequest as NextRequest;
  
  // Add NextRequest-specific properties for type compatibility
  // These are minimal mocks sufficient for API route testing
  Object.defineProperties(nextRequest, {
    cookies: {
      value: {
        get: () => undefined,
        getAll: () => [],
        has: () => false,
        set: () => {},
        delete: () => {},
      },
      enumerable: true,
    },
    geo: {
      value: undefined,
      enumerable: true,
    },
    ip: {
      value: '0.0.0.0',
      enumerable: true,
    },
    nextUrl: {
      value: new URL(url),
      enumerable: true,
    },
  });
  
  return nextRequest;
}

/**
 * Extracts JSON response body from Response object
 * 
 * @param response - Response object from API route
 * @returns Parsed JSON body
 */
export async function getResponseBody<T = any>(response: Response): Promise<T> {
  return await response.json();
}

/**
 * Assertion Helpers
 */

/**
 * Asserts response is successful (2xx status code)
 * 
 * @param response - Response to check
 * @param expectedStatus - Expected specific status code (optional)
 */
export function assertSuccessResponse(response: Response, expectedStatus = 200): void {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
}

/**
 * Asserts response is an error (4xx/5xx status code)
 * 
 * @param response - Response to check
 * @param expectedStatus - Expected specific status code (optional)
 */
export function assertErrorResponse(response: Response, expectedStatus?: number): void {
  if (expectedStatus && response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
  if (response.status < 400) {
    throw new Error(`Expected error status (4xx/5xx), got ${response.status}`);
  }
}

/**
 * Asserts response body contains Zod validation error format
 * 
 * @param body - Response body to check
 */
export function assertValidationError(body: any): void {
  if (!body.error || body.error !== 'Validation failed') {
    throw new Error('Expected Zod validation error format');
  }
  if (!body.details || !Array.isArray(body.details)) {
    throw new Error('Expected validation details array');
  }
}

/**
 * Database Query Helpers
 */

/**
 * Finds a user by username in the database
 * 
 * @param username - Username to search for
 * @returns User document or null
 */
export async function findUserByUsername(username: string) {
  const db = getDb();
  return await db.collection('users').findOne({ username });
}

/**
 * Gets user's total shares in a corporation
 * 
 * @param userId - Numeric ID of the user
 * @param corporationId - Numeric ID of the corporation
 * @returns Total quantity of shares owned
 */
export async function getUserShares(userId: number, corporationId: number): Promise<number> {
  const db = getDb();
  const shareholding = await db.collection('shareholders').findOne({ user_id: userId, corporation_id: corporationId });
  return shareholding?.shares || 0;
}

/**
 * Time Helpers
 */

/**
 * Delays execution for testing async operations
 * 
 * @param ms - Milliseconds to delay
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets current game time for testing time-dependent operations
 * 
 * @returns Current game time Date object
 */
export function getCurrentGameTime(): Date {
  // Simplified for testing - uses real time
  // In production, would use gameTime.ts utilities
  return new Date();
}

/**
 * Test Data Generators
 */

/**
 * Generates a random valid username
 */
export function generateUsername(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Generates a random valid email
 */
export function generateEmail(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generates a random valid ticker symbol
 */
export function generateTicker(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let ticker = '';
  for (let i = 0; i < 4; i++) {
    ticker += chars[Math.floor(Math.random() * chars.length)];
  }
  return ticker;
}

/**
 * Generates a valid password meeting requirements
 */
export function generatePassword(): string {
  return `TestPass${Date.now()}!`;
}

/**
 * Scenario Builders
 */

/**
 * Creates a complete test scenario with user, corporation, and shares
 * 
 * @returns Object containing created test entities
 */
export async function createTestScenario() {
  const user = await createTestUser({
    cash: 100000,
  });
  
  const corporation = await createTestCorporation(user.id, {
    capital: 500000,
    shares: 1000,
    share_price: 100,
  });
  
  const shares = await createTestShares(user.id, corporation.id, 100);
  
  const accessToken = createTestAccessToken(user.id, user.username, user.email, 'user');
  
  return {
    user,
    corporation,
    shares,
    accessToken,
    authHeaders: createAuthHeader(accessToken),
  };
}

/**
 * Creates a test scenario with multiple users and corporations
 * 
 * @param userCount - Number of users to create (default: 2)
 * @param corpsPerUser - Number of corporations per user (default: 1)
 * @returns Array of test scenarios
 */
export async function createMultiUserScenario(
  userCount = 2,
  corpsPerUser = 1
) {
  const scenarios = [];
  
  for (let i = 0; i < userCount; i++) {
    const user = await createTestUser({
      username: `testuser${i}_${Date.now()}`,
      cash: 100000 + (i * 50000),
    });
    
    const corporations = [];
    for (let j = 0; j < corpsPerUser; j++) {
      const corp = await createTestCorporation(user.id, {
        name: `TestCorp${i}_${j}_${Date.now()}`,
        ticker: generateTicker(),
      });
      corporations.push(corp);
    }
    
    const accessToken = createTestAccessToken(user.id, user.username, user.email, 'user');
    
    scenarios.push({
      user,
      corporations,
      accessToken,
      authHeaders: createAuthHeader(accessToken),
    });
  }
  
  return scenarios;
}
