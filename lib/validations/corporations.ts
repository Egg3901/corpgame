/**
 * Corporation Operations Validation Schemas
 * 
 * Zod validation schemas for corporation-related API routes including
 * creation, updates, board operations, and management actions.
 * 
 * @module lib/validations/corporations
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// CORPORATION CREATION SCHEMA
// ============================================================================

/**
 * Create corporation validation schema
 * 
 * Validates corporation creation with name, sector, initial capital,
 * and optional configuration.
 * 
 * @example
 * ```typescript
 * const data = {
 *   name: 'TechCorp Industries',
 *   sector: 'Technology',
 *   initial_capital: 1000000,
 *   ticker: 'TECH',
 *   description: 'Leading technology company'
 * };
 * const result = CreateCorporationSchema.safeParse(data);
 * ```
 */
export const CreateCorporationSchema = z.object({
  name: z
    .string()
    .min(3, 'Corporation name must be at least 3 characters')
    .max(100, 'Corporation name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Corporation name can only contain letters, numbers, spaces, &, ., and -'),
  sector: z
    .string()
    .trim()
    .min(1, 'Sector is required')
    .max(50, 'Sector must not exceed 50 characters'),
  type: z
    .string()
    .max(50, 'Type must not exceed 50 characters')
    .optional(),
  focus: z
    .string()
    .max(50, 'Focus must not exceed 50 characters')
    .optional(),
  initial_capital: z
    .number()
    .positive('Initial capital must be positive')
    .min(100000, 'Initial capital must be at least $100,000')
    .max(100000000, 'Initial capital must not exceed $100,000,000')
    .refine((val) => Number.isFinite(val), 'Initial capital must be a finite number')
    .optional()
    .default(500000),
  ticker: z
    .string()
    .length(4, 'Ticker must be exactly 4 characters')
    .regex(/^[A-Z]{4}$/, 'Ticker must be 4 uppercase letters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  total_shares: z
    .number()
    .int('Total shares must be a whole number')
    .positive('Total shares must be positive')
    .min(1000, 'Total shares must be at least 1,000')
    .max(10000000, 'Total shares must not exceed 10,000,000')
    .optional()
    .default(1000000),
  public_shares: z
    .number()
    .int('Public shares must be a whole number')
    .min(0, 'Public shares cannot be negative')
    .optional()
    .default(0),
});

export type CreateCorporationRequest = z.infer<typeof CreateCorporationSchema>;

// ============================================================================
// CORPORATION UPDATE SCHEMA
// ============================================================================

/**
 * Update corporation validation schema
 * 
 * Allows partial updates to corporation information.
 * All fields are optional.
 * 
 * @example
 * ```typescript
 * const data = {
 *   name: 'TechCorp Industries Inc.',
 *   description: 'Updated description',
 *   public_shares: 250000
 * };
 * const result = UpdateCorporationSchema.safeParse(data);
 * ```
 */
export const UpdateCorporationSchema = z.object({
  name: z
    .string()
    .min(3, 'Corporation name must be at least 3 characters')
    .max(100, 'Corporation name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Corporation name can only contain letters, numbers, spaces, &, ., and -')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  public_shares: z
    .number()
    .int('Public shares must be a whole number')
    .min(0, 'Public shares cannot be negative')
    .optional(),
  logo_url: z
    .string()
    .max(255, 'Logo URL must not exceed 255 characters')
    .optional(),
});

export type UpdateCorporationRequest = z.infer<typeof UpdateCorporationSchema>;

// ============================================================================
// BOARD OPERATIONS SCHEMAS
// ============================================================================

/**
 * Add board member validation schema
 * 
 * Validates adding a user to corporation board with optional title.
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 123,
 *   title: 'Chief Financial Officer'
 * };
 * const result = AddBoardMemberSchema.safeParse(data);
 * ```
 */
export const AddBoardMemberSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must not exceed 100 characters')
    .optional()
    .default('Board Member'),
  salary: z
    .number()
    .min(0, 'Salary cannot be negative')
    .max(10000000, 'Salary must not exceed $10,000,000')
    .refine((val) => Number.isFinite(val), 'Salary must be a finite number')
    .optional(),
});

export type AddBoardMemberRequest = z.infer<typeof AddBoardMemberSchema>;

/**
 * Remove board member validation schema
 * 
 * @example
 * ```typescript
 * const data = { userId: 123 };
 * const result = RemoveBoardMemberSchema.safeParse(data);
 * ```
 */
export const RemoveBoardMemberSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
});

export type RemoveBoardMemberRequest = z.infer<typeof RemoveBoardMemberSchema>;

/**
 * Update board member validation schema
 * 
 * Allows updating board member title and/or salary.
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 123,
 *   title: 'Chief Executive Officer',
 *   salary: 500000
 * };
 * const result = UpdateBoardMemberSchema.safeParse(data);
 * ```
 */
export const UpdateBoardMemberSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(100, 'Title must not exceed 100 characters')
    .optional(),
  salary: z
    .number()
    .min(0, 'Salary cannot be negative')
    .max(10000000, 'Salary must not exceed $10,000,000')
    .refine((val) => Number.isFinite(val), 'Salary must be a finite number')
    .optional(),
});

export type UpdateBoardMemberRequest = z.infer<typeof UpdateBoardMemberSchema>;

// ============================================================================
// CORPORATION QUERY SCHEMAS
// ============================================================================

/**
 * List corporations query validation schema
 * 
 * Query parameters for filtering, sorting, and paginating corporation list.
 * 
 * @example
 * ```typescript
 * const params = {
 *   page: 1,
 *   limit: 20,
 *   sector: 'Technology',
 *   sortBy: 'capital',
 *   sortOrder: 'desc'
 * };
 * const result = ListCorporationsSchema.safeParse(params);
 * ```
 */
export const ListCorporationsSchema = z.object({
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
  sector: z
    .string()
    .max(50, 'Sector must not exceed 50 characters')
    .optional(),
  sortBy: z
    .enum(['name', 'capital', 'share_price', 'created_at', 'sector'])
    .optional()
    .default('name'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc'),
  search: z
    .string()
    .max(100, 'Search term must not exceed 100 characters')
    .optional(),
});

export type ListCorporationsQuery = z.infer<typeof ListCorporationsSchema>;

// ============================================================================
// CAPITAL OPERATIONS SCHEMAS
// ============================================================================

/**
 * Update corporation capital validation schema (Board action)
 * 
 * Allows board to adjust corporation capital.
 * Amount can be positive (add) or negative (reduce).
 * 
 * @example
 * ```typescript
 * const data = {
 *   amount: 500000,
 *   reason: 'Capital raise from investors'
 * };
 * const result = UpdateCapitalSchema.safeParse(data);
 * ```
 */
export const UpdateCapitalSchema = z.object({
  amount: z
    .number()
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number')
    .refine((val) => val !== 0, 'Amount cannot be zero'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must not exceed 200 characters'),
});

export type UpdateCapitalRequest = z.infer<typeof UpdateCapitalSchema>;

/**
 * Issue shares validation schema
 * 
 * Allows board to issue new shares, diluting existing ownership.
 * 
 * @example
 * ```typescript
 * const data = {
 *   shares: 100000,
 *   makePublic: true
 * };
 * const result = IssueSharesSchema.safeParse(data);
 * ```
 */
export const IssueSharesSchema = z.object({
  shares: z
    .number()
    .int('Shares must be a whole number')
    .positive('Shares must be positive')
    .max(1000000, 'Cannot issue more than 1,000,000 shares at once'),
  makePublic: z
    .boolean()
    .optional()
    .default(false),
});

export type IssueSharesRequest = z.infer<typeof IssueSharesSchema>;
