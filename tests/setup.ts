import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Global in-memory MongoDB instance
let mongoServer: MongoMemoryServer | null = null;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Setup test environment variables with in-memory MongoDB URI
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = 'corpgame_test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing-only';
  (process.env as any).NODE_ENV = 'test'; // Type assertion needed since NODE_ENV is read-only in type definitions
}, 30000);

// Stop in-memory MongoDB after all tests
afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

export const routerPushMock = vi.fn();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

// Mock Next.js image
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', { ...props, alt: props.alt });
  },
}));
