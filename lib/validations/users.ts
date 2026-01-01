/**
 * User Operations Validation Schemas
 * 
 * Zod validation schemas for user-related API routes including profile
 * management, cash operations, portfolio queries, and user settings.
 * 
 * @module lib/validations/users
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// PROFILE SCHEMAS
// ============================================================================

/**
 * Update user profile validation schema
 * 
 * Allows updating player_name, gender, age, and avatar.
 * All fields are optional (partial update).
 * 
 * @example
 * ```typescript
 * const data = {
 *   player_name: 'John Smith',
 *   gender: 'Male',
 *   age: 35,
 *   avatar_url: '/uploads/avatars/user123.png'
 * };
 * const result = UpdateProfileSchema.safeParse(data);
 * ```
 */
export const UpdateProfileSchema = z.object({
  player_name: z
    .string()
    .min(1, 'Player name cannot be empty')
    .max(100, 'Player name must not exceed 100 characters')
    .optional(),
  gender: z
    .enum(['Male', 'Female', 'Other'])
    .optional(),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Age must not exceed 120')
    .optional(),
  avatar_url: z
    .string()
    .max(255, 'Avatar URL must not exceed 255 characters')
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must not exceed 500 characters')
    .optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>;

/**
 * Get user profile validation schema
 * 
 * Optional query parameters for profile retrieval.
 * 
 * @example
 * ```typescript
 * const params = { includePortfolio: true, includeTransactions: false };
 * const result = GetProfileSchema.safeParse(params);
 * ```
 */
export const GetProfileSchema = z.object({
  includePortfolio: z
    .boolean()
    .optional()
    .default(false),
  includeTransactions: z
    .boolean()
    .optional()
    .default(false),
  includeShares: z
    .boolean()
    .optional()
    .default(false),
});

export type GetProfileQuery = z.infer<typeof GetProfileSchema>;

// ============================================================================
// CASH OPERATIONS SCHEMAS
// ============================================================================

/**
 * Cash transfer validation schema
 * 
 * Validates cash transfers between users.
 * Amount must be positive and not exceed maximum transfer limit.
 * 
 * @example
 * ```typescript
 * const data = {
 *   toUserId: 123,
 *   amount: 50000,
 *   description: 'Investment payment'
 * };
 * const result = CashTransferSchema.safeParse(data);
 * ```
 */
export const CashTransferSchema = z.object({
  toUserId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(10000000, 'Amount exceeds maximum transfer limit of $10,000,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
  description: z
    .string()
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
});

export type CashTransferRequest = z.infer<typeof CashTransferSchema>;

/**
 * Update user cash validation schema (Admin only)
 * 
 * Allows admins to adjust user cash balance.
 * Amount can be positive (add) or negative (subtract).
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 123,
 *   amount: -5000, // Subtract $5,000
 *   reason: 'Penalty for rule violation'
 * };
 * const result = UpdateCashSchema.safeParse(data);
 * ```
 */
export const UpdateCashSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  amount: z
    .number()
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must not exceed 200 characters'),
});

export type UpdateCashRequest = z.infer<typeof UpdateCashSchema>;

// ============================================================================
// PORTFOLIO SCHEMAS
// ============================================================================

/**
 * Portfolio query validation schema
 * 
 * Query parameters for filtering and paginating portfolio data.
 * 
 * @example
 * ```typescript
 * const params = {
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'value',
 *   sortOrder: 'desc',
 *   corporationId: 5
 * };
 * const result = PortfolioQuerySchema.safeParse(params);
 * ```
 */
export const PortfolioQuerySchema = z.object({
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
    .enum(['value', 'shares', 'corporation', 'date'])
    .optional()
    .default('value'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  corporationId: z
    .number()
    .int('Corporation ID must be a whole number')
    .positive('Corporation ID must be positive')
    .optional(),
});

export type PortfolioQuery = z.infer<typeof PortfolioQuerySchema>;

// ============================================================================
// TRANSACTION HISTORY SCHEMAS
// ============================================================================

/**
 * Transaction history query validation schema
 * 
 * Query parameters for filtering and paginating transaction history.
 * 
 * @example
 * ```typescript
 * const params = {
 *   page: 1,
 *   limit: 50,
 *   type: 'share_purchase',
 *   startDate: '2025-01-01',
 *   endDate: '2025-12-31'
 * };
 * const result = TransactionHistorySchema.safeParse(params);
 * ```
 */
export const TransactionHistorySchema = z.object({
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
  type: z
    .enum([
      'share_purchase',
      'share_sale',
      'cash_transfer',
      'dividend',
      'loan',
      'salary',
      'other',
    ])
    .optional(),
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

export type TransactionHistoryQuery = z.infer<typeof TransactionHistorySchema>;

// ============================================================================
// USER SETTINGS SCHEMAS
// ============================================================================

/**
 * Update user settings validation schema
 * 
 * Allows updating user preferences and notification settings.
 * 
 * @example
 * ```typescript
 * const data = {
 *   emailNotifications: true,
 *   dividendAlerts: true,
 *   priceAlerts: false,
 *   theme: 'dark'
 * };
 * const result = UpdateSettingsSchema.safeParse(data);
 * ```
 */
export const UpdateSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  dividendAlerts: z.boolean().optional(),
  priceAlerts: z.boolean().optional(),
  marketAlerts: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.enum(['en', 'es', 'fr', 'de']).optional(),
});

export type UpdateSettingsRequest = z.infer<typeof UpdateSettingsSchema>;
