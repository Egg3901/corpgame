/**
 * Share Trading Validation Schemas
 * 
 * Zod validation schemas for share trading operations including buying,
 * selling, transferring shares, and querying share information.
 * 
 * @module lib/validations/shares
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// BUY SHARES SCHEMA
// ============================================================================

/**
 * Buy shares validation schema
 * 
 * Validates share purchase requests with quantity validation.
 * Shares must be positive integer.
 * 
 * @example
 * ```typescript
 * const data = { shares: 100 };
 * const result = BuySharesSchema.safeParse(data);
 * ```
 */
export const BuySharesSchema = z.object({
  shares: z
    .number()
    .int('Shares must be a whole number')
    .positive('Shares must be positive')
    .max(1000000, 'Cannot buy more than 1,000,000 shares at once'),
});

export type BuySharesRequest = z.infer<typeof BuySharesSchema>;

// ============================================================================
// SELL SHARES SCHEMA
// ============================================================================

/**
 * Sell shares validation schema
 * 
 * Validates share selling requests with quantity validation.
 * Shares must be positive integer.
 * 
 * @example
 * ```typescript
 * const data = { shares: 50 };
 * const result = SellSharesSchema.safeParse(data);
 * ```
 */
export const SellSharesSchema = z.object({
  shares: z
    .number()
    .int('Shares must be a whole number')
    .positive('Shares must be positive')
    .max(1000000, 'Cannot sell more than 1,000,000 shares at once'),
});

export type SellSharesRequest = z.infer<typeof SellSharesSchema>;

// ============================================================================
// TRANSFER SHARES SCHEMA
// ============================================================================

/**
 * Transfer shares validation schema
 * 
 * Validates share transfers between users.
 * Requires recipient user ID and share quantity.
 * 
 * @example
 * ```typescript
 * const data = {
 *   toUserId: 456,
 *   shares: 25,
 *   description: 'Gift to partner'
 * };
 * const result = TransferSharesSchema.safeParse(data);
 * ```
 */
export const TransferSharesSchema = z.object({
  toUserId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  shares: z
    .number()
    .int('Shares must be a whole number')
    .positive('Shares must be positive')
    .max(1000000, 'Cannot transfer more than 1,000,000 shares at once'),
  description: z
    .string()
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
});

export type TransferSharesRequest = z.infer<typeof TransferSharesSchema>;

// ============================================================================
// SHARE QUERY SCHEMAS
// ============================================================================

/**
 * List shares query validation schema
 * 
 * Query parameters for filtering and paginating share listings.
 * 
 * @example
 * ```typescript
 * const params = {
 *   corporationId: 5,
 *   page: 1,
 *   limit: 20
 * };
 * const result = ListSharesSchema.safeParse(params);
 * ```
 */
export const ListSharesSchema = z.object({
  corporationId: z
    .number()
    .int('Corporation ID must be a whole number')
    .positive('Corporation ID must be positive')
    .optional(),
  page: z
    .number()
    .int('Page must be a whole number')
    .positive('Page must be positive')
    .optional()
    .default(1),
  limit: z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .optional()
    .default(20),
  sortBy: z
    .enum(['price', 'volume', 'corporation', 'date'])
    .optional()
    .default('price'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

export type ListSharesQuery = z.infer<typeof ListSharesSchema>;

/**
 * Share price history query validation schema
 * 
 * Query parameters for retrieving historical share price data.
 * 
 * @example
 * ```typescript
 * const params = {
 *   startDate: '2025-01-01T00:00:00Z',
 *   endDate: '2025-12-31T23:59:59Z',
 *   interval: 'day'
 * };
 * const result = SharePriceHistorySchema.safeParse(params);
 * ```
 */
export const SharePriceHistorySchema = z.object({
  startDate: z
    .string()
    .datetime('Invalid start date format (ISO 8601 required)')
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date format (ISO 8601 required)')
    .optional(),
  interval: z
    .enum(['hour', 'day', 'week', 'month'])
    .optional()
    .default('day'),
  limit: z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(1000, 'Limit must not exceed 1000')
    .optional()
    .default(100),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date', path: ['startDate'] }
);

export type SharePriceHistoryQuery = z.infer<typeof SharePriceHistorySchema>;

/**
 * Share transaction history query validation schema
 * 
 * Query parameters for retrieving share transaction history.
 * 
 * @example
 * ```typescript
 * const params = {
 *   corporationId: 5,
 *   type: 'buy',
 *   page: 1,
 *   limit: 50
 * };
 * const result = ShareTransactionHistorySchema.safeParse(params);
 * ```
 */
export const ShareTransactionHistorySchema = z.object({
  corporationId: z
    .number()
    .int('Corporation ID must be a whole number')
    .positive('Corporation ID must be positive')
    .optional(),
  type: z
    .enum(['buy', 'sell', 'transfer', 'issue'])
    .optional(),
  page: z
    .number()
    .int('Page must be a whole number')
    .positive('Page must be positive')
    .optional()
    .default(1),
  limit: z
    .number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .optional()
    .default(50),
  startDate: z
    .string()
    .datetime('Invalid start date format (ISO 8601 required)')
    .optional(),
  endDate: z
    .string()
    .datetime('Invalid end date format (ISO 8601 required)')
    .optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date', path: ['startDate'] }
);

export type ShareTransactionHistoryQuery = z.infer<typeof ShareTransactionHistorySchema>;

// ============================================================================
// SHARE VALUATION SCHEMA
// ============================================================================

/**
 * Share valuation calculation schema
 * 
 * Optional parameters for customizing valuation calculation.
 * 
 * @example
 * ```typescript
 * const params = {
 *   includeAnalysis: true,
 *   method: 'fundamental'
 * };
 * const result = ShareValuationSchema.safeParse(params);
 * ```
 */
export const ShareValuationSchema = z.object({
  includeAnalysis: z
    .boolean()
    .optional()
    .default(false),
  method: z
    .enum(['fundamental', 'market', 'hybrid'])
    .optional()
    .default('fundamental'),
});

export type ShareValuationQuery = z.infer<typeof ShareValuationSchema>;
