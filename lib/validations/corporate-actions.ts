/**
 * Corporate Actions Validation Schemas
 * 
 * Zod validation schemas for corporate action operations including
 * dividends, voting, capital raises, and other shareholder actions.
 * 
 * @module lib/validations/corporate-actions
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// DIVIDEND SCHEMAS
// ============================================================================

/**
 * Declare dividend validation schema
 * 
 * Validates dividend declaration with amount per share and payment date.
 * Amount must be positive, date must be in the future.
 * 
 * @example
 * ```typescript
 * const data = {
 *   amountPerShare: 2.50,
 *   paymentDate: '2025-06-15T00:00:00Z',
 *   description: 'Q2 2025 dividend payment'
 * };
 * const result = DeclareDividendSchema.safeParse(data);
 * ```
 */
export const DeclareDividendSchema = z.object({
  amountPerShare: z
    .number()
    .positive('Amount per share must be positive')
    .max(1000, 'Amount per share must not exceed $1,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
  paymentDate: z
    .string()
    .datetime('Invalid payment date format (ISO 8601 required)'),
  recordDate: z
    .string()
    .datetime('Invalid record date format (ISO 8601 required)')
    .optional(),
  description: z
    .string()
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
}).refine(
  (data) => {
    const paymentDate = new Date(data.paymentDate);
    const now = new Date();
    return paymentDate > now;
  },
  { message: 'Payment date must be in the future', path: ['paymentDate'] }
).refine(
  (data) => {
    if (data.recordDate) {
      const recordDate = new Date(data.recordDate);
      const paymentDate = new Date(data.paymentDate);
      return recordDate < paymentDate;
    }
    return true;
  },
  { message: 'Record date must be before payment date', path: ['recordDate'] }
);

export type DeclareDividendRequest = z.infer<typeof DeclareDividendSchema>;

/**
 * Cancel dividend validation schema
 * 
 * @example
 * ```typescript
 * const data = {
 *   dividendId: 123,
 *   reason: 'Insufficient funds'
 * };
 * const result = CancelDividendSchema.safeParse(data);
 * ```
 */
export const CancelDividendSchema = z.object({
  dividendId: z
    .number()
    .int('Dividend ID must be a whole number')
    .positive('Dividend ID must be positive'),
  reason: z
    .string()
    .min(1, 'Reason is required')
    .max(200, 'Reason must not exceed 200 characters'),
});

export type CancelDividendRequest = z.infer<typeof CancelDividendSchema>;

// ============================================================================
// VOTING SCHEMAS
// ============================================================================

/**
 * Create vote validation schema
 * 
 * Validates vote/proposal creation with title, description, and options.
 * 
 * @example
 * ```typescript
 * const data = {
 *   title: 'Approve merger with XYZ Corp',
 *   description: 'Vote on proposed merger agreement',
 *   options: ['Approve', 'Reject', 'Abstain'],
 *   endDate: '2025-02-28T23:59:59Z'
 * };
 * const result = CreateVoteSchema.safeParse(data);
 * ```
 */
export const CreateVoteSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  options: z
    .array(z.string().min(1).max(100))
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed'),
  endDate: z
    .string()
    .datetime('Invalid end date format (ISO 8601 required)'),
  requiresMajority: z
    .boolean()
    .optional()
    .default(true),
  quorumPercentage: z
    .number()
    .min(0, 'Quorum percentage cannot be negative')
    .max(100, 'Quorum percentage cannot exceed 100')
    .optional()
    .default(50),
}).refine(
  (data) => {
    const endDate = new Date(data.endDate);
    const now = new Date();
    return endDate > now;
  },
  { message: 'End date must be in the future', path: ['endDate'] }
);

export type CreateVoteRequest = z.infer<typeof CreateVoteSchema>;

/**
 * Cast vote validation schema
 * 
 * Validates shareholder vote casting with option selection.
 * 
 * @example
 * ```typescript
 * const data = {
 *   voteId: 456,
 *   option: 'Approve',
 *   comment: 'I support this decision'
 * };
 * const result = CastVoteSchema.safeParse(data);
 * ```
 */
export const CastVoteSchema = z.object({
  voteId: z
    .number()
    .int('Vote ID must be a whole number')
    .positive('Vote ID must be positive'),
  option: z
    .string()
    .min(1, 'Option is required')
    .max(100, 'Option must not exceed 100 characters'),
  comment: z
    .string()
    .max(500, 'Comment must not exceed 500 characters')
    .optional(),
});

export type CastVoteRequest = z.infer<typeof CastVoteSchema>;

// ============================================================================
// CAPITAL RAISE SCHEMAS
// ============================================================================

/**
 * Capital raise validation schema
 * 
 * Validates capital raise with target amount, share price, and terms.
 * 
 * @example
 * ```typescript
 * const data = {
 *   targetAmount: 5000000,
 *   pricePerShare: 50,
 *   endDate: '2025-03-31T23:59:59Z',
 *   description: 'Series B funding round'
 * };
 * const result = CapitalRaiseSchema.safeParse(data);
 * ```
 */
export const CapitalRaiseSchema = z.object({
  targetAmount: z
    .number()
    .positive('Target amount must be positive')
    .min(100000, 'Target amount must be at least $100,000')
    .max(100000000, 'Target amount must not exceed $100,000,000')
    .refine((val) => Number.isFinite(val), 'Target amount must be a finite number'),
  pricePerShare: z
    .number()
    .positive('Price per share must be positive')
    .max(10000, 'Price per share must not exceed $10,000')
    .refine((val) => Number.isFinite(val), 'Price must be a finite number'),
  endDate: z
    .string()
    .datetime('Invalid end date format (ISO 8601 required)'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  minimumInvestment: z
    .number()
    .positive('Minimum investment must be positive')
    .optional(),
}).refine(
  (data) => {
    const endDate = new Date(data.endDate);
    const now = new Date();
    return endDate > now;
  },
  { message: 'End date must be in the future', path: ['endDate'] }
);

export type CapitalRaiseRequest = z.infer<typeof CapitalRaiseSchema>;

/**
 * Participate in capital raise validation schema
 * 
 * Validates investor participation in capital raise.
 * 
 * @example
 * ```typescript
 * const data = {
 *   raiseId: 789,
 *   amount: 50000
 * };
 * const result = ParticipateCapitalRaiseSchema.safeParse(data);
 * ```
 */
export const ParticipateCapitalRaiseSchema = z.object({
  raiseId: z
    .number()
    .int('Raise ID must be a whole number')
    .positive('Raise ID must be positive'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(10000000, 'Amount must not exceed $10,000,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
});

export type ParticipateCapitalRaiseRequest = z.infer<typeof ParticipateCapitalRaiseSchema>;

// ============================================================================
// STOCK SPLIT SCHEMA
// ============================================================================

/**
 * Stock split validation schema
 * 
 * Validates stock split with ratio (e.g., 2-for-1 split).
 * 
 * @example
 * ```typescript
 * const data = {
 *   splitRatio: 2,
 *   effectiveDate: '2025-04-01T00:00:00Z',
 *   description: '2-for-1 stock split'
 * };
 * const result = StockSplitSchema.safeParse(data);
 * ```
 */
export const StockSplitSchema = z.object({
  splitRatio: z
    .number()
    .positive('Split ratio must be positive')
    .min(1.1, 'Split ratio must be at least 1.1')
    .max(10, 'Split ratio must not exceed 10')
    .refine((val) => Number.isFinite(val), 'Split ratio must be a finite number'),
  effectiveDate: z
    .string()
    .datetime('Invalid effective date format (ISO 8601 required)'),
  description: z
    .string()
    .max(200, 'Description must not exceed 200 characters')
    .optional(),
}).refine(
  (data) => {
    const effectiveDate = new Date(data.effectiveDate);
    const now = new Date();
    return effectiveDate > now;
  },
  { message: 'Effective date must be in the future', path: ['effectiveDate'] }
);

export type StockSplitRequest = z.infer<typeof StockSplitSchema>;
