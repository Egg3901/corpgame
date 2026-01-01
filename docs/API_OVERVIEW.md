# API Documentation Overview

**Version:** 1.0  
**Last Updated:** 2025-12-31  
**Base URL:** `https://corpgame.com` (production) | `http://localhost:3000` (development)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Users](#users-endpoints)
   - [Corporations](#corporations-endpoints)
   - [Shares & Trading](#shares--trading-endpoints)
   - [Corporate Actions](#corporate-actions-endpoints)
   - [Commodities & Products](#commodities--products-endpoints)
   - [Game State](#game-state-endpoints)
   - [Admin](#admin-endpoints)

---

## Overview

The Corporate Game Platform API is a REST-like API built with Next.js 14 API Routes. All endpoints are located under `/api/*` and return JSON responses.

### Key Features

- **RESTful Design:** Standard HTTP methods (GET, POST, PATCH, DELETE)
- **JWT Authentication:** Bearer token-based auth (access + refresh tokens)
- **Zod Validation:** Request validation with detailed error messages
- **Rate Limiting:** Protection against abuse (100-500 requests/15min)
- **CORS Enabled:** Cross-origin requests allowed from whitelisted origins
- **Security Headers:** OWASP-compliant security headers on all responses

### API Principles

1. **Resource-Based URLs:** `/api/corporations`, `/api/users/[id]`
2. **HTTP Method Semantics:** GET (read), POST (create), PATCH (update), DELETE (remove)
3. **JSON Everywhere:** Request bodies and responses in JSON
4. **Consistent Error Format:** Standard error structure across all endpoints
5. **Idempotency:** PUT/PATCH operations are idempotent (safe to retry)

---

## Authentication

### Overview

The API uses **JWT (JSON Web Token)** authentication with:
- **Access Token:** Short-lived (15 minutes), included in Authorization header
- **Refresh Token:** Long-lived (7 days), stored as HTTP-only cookie
- **Token Rotation:** Refresh tokens rotate on each use (security best practice)

### Authentication Flow

```
1. User logs in with email/password
   POST /api/auth/login
   
2. Server returns:
   - Access token (JWT, 15min expiry)
   - Refresh token (HTTP-only cookie, 7 days)
   
3. Client stores access token (memory or sessionStorage)
   
4. Client makes authenticated requests:
   GET /api/users/me
   Authorization: Bearer <access_token>
   
5. Access token expires after 15 minutes
   
6. Client refreshes token:
   POST /api/auth/refresh
   (Refresh token sent automatically via cookie)
   
7. Server returns new access token + rotated refresh token
   
8. Repeat from step 3
```

### Making Authenticated Requests

**Include access token in Authorization header:**

```typescript
const response = await fetch('/api/users/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important: Send cookies (refresh token)
});
```

### Token Expiry Handling

```typescript
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  // If 401 (Unauthorized), try refreshing token
  if (response.status === 401) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (refreshResponse.ok) {
      const { accessToken: newToken } = await refreshResponse.json();
      accessToken = newToken; // Update stored token
      
      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
        },
      });
    }
  }
  
  return response;
}
```

---

## Common Patterns

### Request Format

**All POST/PATCH requests use JSON:**

```typescript
const response = await fetch('/api/corporations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    name: 'Acme Corporation',
    sector: 'technology',
    initialCapital: 1000000,
  }),
});
```

### Response Format

**Success Response (2xx):**

```json
{
  "id": "corp_abc123",
  "name": "Acme Corporation",
  "sector": "technology",
  "capital": 1000000,
  "createdAt": "2025-12-31T10:30:45.123Z"
}
```

**List Response:**

```json
{
  "corporations": [
    { "id": "corp_123", "name": "Acme Corp" },
    { "id": "corp_456", "name": "Globex Inc" }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

### Pagination

**Query Parameters:**

```
GET /api/corporations?page=2&limit=50
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 247,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Filtering & Sorting

**Filter by field:**

```
GET /api/corporations?sector=technology&active=true
```

**Sort results:**

```
GET /api/corporations?sort=-createdAt  # Descending by createdAt
GET /api/corporations?sort=name        # Ascending by name
```

---

## Error Handling

### Standard Error Format

**All errors return consistent structure:**

```json
{
  "error": "Human-readable error message",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no response body) |
| 400 | Bad Request | Invalid request (validation error) |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or conflict |
| 422 | Unprocessable Entity | Validation failed (detailed errors) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (should not happen) |

### Validation Errors (Zod)

**Request with invalid data:**

```json
POST /api/corporations
{
  "name": "A",  // Too short (min 3 chars)
  "sector": "invalid_sector"  // Not in enum
}
```

**Error Response (422):**

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "path": ["name"],
      "message": "String must contain at least 3 character(s)",
      "code": "too_small"
    },
    {
      "path": ["sector"],
      "message": "Invalid enum value. Expected 'technology' | 'finance' | 'energy' | ...",
      "code": "invalid_enum_value"
    }
  ]
}
```

### Authentication Errors

**Missing token (401):**

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Invalid/expired token (401):**

```json
{
  "error": "Invalid or expired token",
  "code": "TOKEN_INVALID"
}
```

**Insufficient permissions (403):**

```json
{
  "error": "You do not have permission to perform this action",
  "code": "FORBIDDEN"
}
```

---

## Rate Limiting

### Limits by Endpoint Type

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Public (no auth) | 100 requests | 15 minutes |
| Authenticated | 500 requests | 15 minutes |
| Sensitive (auth) | 20 requests | 15 minutes |
| Admin | 1000 requests | 15 minutes |

### Rate Limit Headers

**Every response includes rate limit info:**

```
X-RateLimit-Limit: 500           # Total requests allowed
X-RateLimit-Remaining: 487       # Requests remaining
X-RateLimit-Reset: 1672531200    # Unix timestamp when limit resets
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 45,  // Seconds until retry allowed
  "limit": 500,
  "windowMs": 900000
}
```

**Handling rate limits:**

```typescript
const response = await fetch('/api/endpoint');

if (response.status === 429) {
  const data = await response.json();
  const retryAfter = data.retryAfter; // Seconds
  
  // Wait and retry
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  return fetch('/api/endpoint'); // Retry
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/register`

**Create new user account**

**Request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "john_doe"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "message": "Account created successfully"
}
```

**Errors:**
- `409 Conflict` - Email or username already exists
- `422 Validation Error` - Invalid email/password format

---

#### POST `/api/auth/login`

**Authenticate user and get tokens**

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "username": "john_doe",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Note:** Refresh token set as HTTP-only cookie automatically

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `429 Too Many Requests` - Rate limited (20 attempts/15min)

---

#### POST `/api/auth/refresh`

**Refresh access token using refresh token (cookie)**

**Request:** (No body, refresh token sent via cookie)

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Note:** New refresh token set as HTTP-only cookie (rotation)

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

#### POST `/api/auth/logout`

**Invalidate refresh token and log out**

**Auth Required:** Yes

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Users Endpoints

#### GET `/api/users/me`

**Get current authenticated user profile**

**Auth Required:** Yes

**Response (200):**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "username": "john_doe",
  "role": "user",
  "cash": 50000,
  "netWorth": 125000,
  "createdAt": "2025-12-01T10:00:00.000Z"
}
```

---

#### GET `/api/users/[id]`

**Get user profile by ID**

**Auth Required:** Yes

**Response (200):**
```json
{
  "id": "user_456",
  "username": "jane_investor",
  "netWorth": 250000,
  "portfolioValue": 200000,
  "totalShares": 5000
}
```

**Errors:**
- `404 Not Found` - User doesn't exist

---

#### PATCH `/api/users/[id]`

**Update user profile (own profile only)**

**Auth Required:** Yes

**Request:**
```json
{
  "username": "new_username",
  "bio": "Professional investor"
}
```

**Response (200):**
```json
{
  "id": "user_123",
  "username": "new_username",
  "bio": "Professional investor",
  "updatedAt": "2025-12-31T10:30:00.000Z"
}
```

**Errors:**
- `403 Forbidden` - Cannot update other users' profiles
- `409 Conflict` - Username already taken

---

#### GET `/api/users/[id]/portfolio`

**Get user's stock portfolio**

**Auth Required:** Yes

**Response (200):**
```json
{
  "userId": "user_123",
  "totalValue": 125000,
  "totalShares": 2500,
  "holdings": [
    {
      "corporationId": "corp_456",
      "corporationName": "Acme Corp",
      "shares": 1000,
      "averageCost": 45.50,
      "currentPrice": 52.00,
      "totalValue": 52000,
      "profitLoss": 6500,
      "profitLossPercent": 14.29
    },
    {
      "corporationId": "corp_789",
      "corporationName": "Globex Inc",
      "shares": 1500,
      "averageCost": 38.00,
      "currentPrice": 42.00,
      "totalValue": 63000,
      "profitLoss": 6000,
      "profitLossPercent": 10.53
    }
  ]
}
```

---

### Corporations Endpoints

#### GET `/api/corporations`

**List all corporations**

**Auth Required:** Optional (public endpoint)

**Query Parameters:**
- `sector` (string) - Filter by sector
- `active` (boolean) - Filter by active status
- `page` (number) - Page number (default: 1)
- `limit` (number) - Results per page (default: 20, max: 100)
- `sort` (string) - Sort field (e.g., "name", "-createdAt")

**Response (200):**
```json
{
  "corporations": [
    {
      "id": "corp_123",
      "name": "Acme Corporation",
      "ticker": "ACME",
      "sector": "technology",
      "sharePrice": 52.00,
      "marketCap": 5200000,
      "totalShares": 100000,
      "CEO": "John Founder",
      "founded": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### POST `/api/corporations`

**Create new corporation**

**Auth Required:** Yes  
**Rate Limit:** 20 requests / 15 minutes

**Request:**
```json
{
  "name": "Acme Corporation",
  "sector": "technology",
  "initialCapital": 1000000,
  "description": "Leading technology innovator"
}
```

**Response (201):**
```json
{
  "id": "corp_123",
  "name": "Acme Corporation",
  "ticker": "ACME",
  "sector": "technology",
  "capital": 1000000,
  "sharePrice": 10.00,
  "totalShares": 100000,
  "CEO": "John Founder",
  "founded": "2025-12-31T10:30:45.123Z"
}
```

**Errors:**
- `409 Conflict` - Corporation name already exists
- `422 Validation Error` - Invalid sector or capital amount

---

#### GET `/api/corporations/[id]`

**Get corporation details**

**Auth Required:** Optional

**Response (200):**
```json
{
  "id": "corp_123",
  "name": "Acme Corporation",
  "ticker": "ACME",
  "sector": "technology",
  "description": "Leading technology innovator",
  "CEO": "John Founder",
  "founded": "2024-01-15T00:00:00.000Z",
  "financials": {
    "capital": 1500000,
    "sharePrice": 52.00,
    "marketCap": 5200000,
    "totalShares": 100000,
    "outstandingShares": 85000,
    "treasuryShares": 15000,
    "revenue": 2500000,
    "expenses": 1800000,
    "profit": 700000
  },
  "products": [
    {
      "id": "prod_456",
      "name": "Widget Pro",
      "price": 99.99,
      "productionCost": 45.00
    }
  ]
}
```

**Errors:**
- `404 Not Found` - Corporation doesn't exist

---

#### PATCH `/api/corporations/[id]`

**Update corporation (CEO only)**

**Auth Required:** Yes (must be CEO)

**Request:**
```json
{
  "description": "Updated description",
  "dividendRate": 0.05
}
```

**Response (200):**
```json
{
  "id": "corp_123",
  "description": "Updated description",
  "dividendRate": 0.05,
  "updatedAt": "2025-12-31T10:35:00.000Z"
}
```

**Errors:**
- `403 Forbidden` - Not the CEO of this corporation
- `404 Not Found` - Corporation doesn't exist

---

### Shares & Trading Endpoints

#### POST `/api/shares/[id]/buy`

**Buy shares of corporation**

**Auth Required:** Yes

**Request:**
```json
{
  "shares": 100,
  "maxPrice": 52.50  // Optional: Maximum price willing to pay
}
```

**Response (200):**
```json
{
  "transaction": {
    "id": "txn_789",
    "type": "BUY",
    "corporationId": "corp_123",
    "shares": 100,
    "pricePerShare": 52.00,
    "totalCost": 5200,
    "timestamp": "2025-12-31T10:40:00.000Z"
  },
  "newCashBalance": 44800,
  "newShareBalance": 1100
}
```

**Errors:**
- `400 Bad Request` - Insufficient funds
- `400 Bad Request` - Price exceeds maxPrice limit
- `404 Not Found` - Corporation doesn't exist
- `422 Validation Error` - Invalid share quantity

---

#### POST `/api/shares/[id]/sell`

**Sell shares of corporation**

**Auth Required:** Yes

**Request:**
```json
{
  "shares": 50,
  "minPrice": 51.00  // Optional: Minimum price willing to accept
}
```

**Response (200):**
```json
{
  "transaction": {
    "id": "txn_790",
    "type": "SELL",
    "corporationId": "corp_123",
    "shares": 50,
    "pricePerShare": 52.00,
    "totalRevenue": 2600,
    "timestamp": "2025-12-31T10:45:00.000Z"
  },
  "newCashBalance": 47400,
  "newShareBalance": 1050,
  "capitalGain": 325  // Profit from sale
}
```

**Errors:**
- `400 Bad Request` - Insufficient shares owned
- `400 Bad Request` - Price below minPrice limit
- `404 Not Found` - Corporation doesn't exist

---

#### POST `/api/shares/transfer`

**Transfer shares to another user**

**Auth Required:** Yes

**Request:**
```json
{
  "corporationId": "corp_123",
  "recipientId": "user_456",
  "shares": 25
}
```

**Response (200):**
```json
{
  "transfer": {
    "id": "transfer_123",
    "fromUserId": "user_123",
    "toUserId": "user_456",
    "corporationId": "corp_123",
    "shares": 25,
    "timestamp": "2025-12-31T10:50:00.000Z"
  },
  "newShareBalance": 1025
}
```

**Errors:**
- `400 Bad Request` - Insufficient shares owned
- `404 Not Found` - Recipient or corporation doesn't exist

---

### Corporate Actions Endpoints

#### POST `/api/corporate-actions/dividend`

**Declare dividend (CEO only)**

**Auth Required:** Yes (CEO)

**Request:**
```json
{
  "corporationId": "corp_123",
  "amountPerShare": 0.50,
  "exDividendDate": "2025-01-15",
  "paymentDate": "2025-01-31"
}
```

**Response (201):**
```json
{
  "action": {
    "id": "action_456",
    "type": "DIVIDEND",
    "corporationId": "corp_123",
    "amountPerShare": 0.50,
    "totalAmount": 42500,  // 85,000 shares * $0.50
    "exDividendDate": "2025-01-15T00:00:00.000Z",
    "paymentDate": "2025-01-31T00:00:00.000Z",
    "status": "PENDING"
  }
}
```

**Errors:**
- `403 Forbidden` - Not the CEO
- `400 Bad Request` - Insufficient corporate funds

---

#### POST `/api/corporate-actions/stock-split`

**Execute stock split (CEO only)**

**Auth Required:** Yes (CEO)

**Request:**
```json
{
  "corporationId": "corp_123",
  "ratio": 2,  // 2-for-1 split
  "effectiveDate": "2025-02-01"
}
```

**Response (201):**
```json
{
  "action": {
    "id": "action_457",
    "type": "STOCK_SPLIT",
    "corporationId": "corp_123",
    "ratio": 2,
    "oldSharePrice": 52.00,
    "newSharePrice": 26.00,
    "oldTotalShares": 100000,
    "newTotalShares": 200000,
    "effectiveDate": "2025-02-01T00:00:00.000Z"
  }
}
```

---

### Admin Endpoints

#### GET `/api/admin/users`

**List all users (admin only)**

**Auth Required:** Yes (Admin)

**Response (200):**
```json
{
  "users": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "username": "john_doe",
      "role": "user",
      "netWorth": 125000,
      "createdAt": "2024-12-01T00:00:00.000Z"
    }
  ],
  "total": 247
}
```

**Errors:**
- `403 Forbidden` - Not an admin

---

#### POST `/api/admin/game-state/advance`

**Advance game time (admin only)**

**Auth Required:** Yes (Admin)

**Request:**
```json
{
  "hours": 24  // Advance 24 hours
}
```

**Response (200):**
```json
{
  "oldTime": "2025-12-31T00:00:00.000Z",
  "newTime": "2026-01-01T00:00:00.000Z",
  "hoursAdvanced": 24,
  "eventsTriggered": [
    "Dividends paid for 5 corporations",
    "Market prices updated",
    "Production cycles completed"
  ]
}
```

---

## SDK Examples

### TypeScript/JavaScript Client

```typescript
class CorpGameAPI {
  private accessToken: string | null = null;
  private baseURL: string;
  
  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }
  
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    return data;
  }
  
  async getCorporations() {
    const response = await fetch(`${this.baseURL}/api/corporations`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });
    
    return response.json();
  }
  
  async buyShares(corporationId: string, shares: number) {
    const response = await fetch(
      `${this.baseURL}/api/shares/${corporationId}/buy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shares }),
      }
    );
    
    return response.json();
  }
}

// Usage
const api = new CorpGameAPI();
await api.login('user@example.com', 'password');
const corps = await api.getCorporations();
await api.buyShares('corp_123', 100);
```

---

## Testing

### Postman Collection

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Corporate Game API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    },
    {
      "key": "accessToken",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"user@example.com\",\"password\":\"password\"}"
            }
          }
        }
      ]
    }
  ]
}
```

---

## Related Documentation

- [Middleware Configuration Guide](./MIDDLEWARE_GUIDE.md)
- [Authentication System](../docs/AUTHENTICATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

---

**Document Version:** 1.0  
**Created:** 2025-12-31  
**Author:** API Team  
**Status:** Production-ready documentation
