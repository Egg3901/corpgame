const jwt = require('jsonwebtoken');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

// Mock environment if not set (for CI/Testing without .env.local)
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-key-at-least-32-chars-long';
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars-long';

const secret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

console.log('Testing JWT Logic...');

// 1. Test Key Strength
assert.ok(secret.length >= 32, 'JWT_SECRET should be long enough');
assert.ok(refreshSecret.length >= 32, 'JWT_REFRESH_SECRET should be long enough');
assert.notStrictEqual(secret, refreshSecret, 'Secrets should be different');

// 2. Test Token Generation & Verification (Simulation)
const payload = { userId: 123, email: 'test@example.com' };
const token = jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'HS256' });
const decoded = jwt.verify(token, secret);

assert.strictEqual(decoded.userId, 123);
assert.strictEqual(decoded.email, 'test@example.com');

// 3. Test Refresh Token
const refreshPayload = { ...payload, tokenType: 'refresh' };
const refreshToken = jwt.sign(refreshPayload, refreshSecret, { expiresIn: '7d', algorithm: 'HS256' });
const decodedRefresh = jwt.verify(refreshToken, refreshSecret);

assert.strictEqual(decodedRefresh.tokenType, 'refresh');

// 4. Test Cross-Verification Failure (Access token signed with refresh secret should fail)
try {
  jwt.verify(token, refreshSecret);
  assert.fail('Should not verify access token with refresh secret');
} catch (e) {
  assert.ok(e.message.includes('invalid signature'));
}

console.log('JWT Security Tests Passed.');
