/**
 * Loan Operations Validation Schemas
 * 
 * Zod validation schemas for loan-related operations including
 * loan requests, approvals, repayments, and loan management.
 * 
 * @module lib/validations/loans
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// LOAN REQUEST SCHEMA
// ============================================================================

/**
 * Loan request validation schema
 * 
 * Validates loan application with amount, term, interest rate, and purpose.
 * 
 * @example
 * ```typescript
 * const data = {
 *   amount: 500000,
 *   termMonths: 24,
 *   interestRate: 8.5,
 *   purpose: 'Expansion capital',
 *   collateral: 'Corporation shares'
 * };
 * const result = RequestLoanSchema.safeParse(data);
 * ```
 */
export const RequestLoanSchema = z.object({
  amount: z
    .number()
    .positive('Loan amount must be positive')
    .min(10000, 'Loan amount must be at least $10,000')
    .max(50000000, 'Loan amount must not exceed $50,000,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
  termMonths: z
    .number()
    .int('Term must be a whole number of months')
    .positive('Term must be positive')
    .min(1, 'Term must be at least 1 month')
    .max(360, 'Term must not exceed 360 months (30 years)'),
  interestRate: z
    .number()
    .positive('Interest rate must be positive')
    .min(0.1, 'Interest rate must be at least 0.1%')
    .max(50, 'Interest rate must not exceed 50%')
    .refine((val) => Number.isFinite(val), 'Interest rate must be a finite number'),
  purpose: z
    .string()
    .min(10, 'Purpose must be at least 10 characters')
    .max(500, 'Purpose must not exceed 500 characters'),
  collateral: z
    .string()
    .max(200, 'Collateral description must not exceed 200 characters')
    .optional(),
  guarantorUserId: z
    .number()
    .int('Guarantor user ID must be a whole number')
    .positive('Guarantor user ID must be positive')
    .optional(),
});

export type RequestLoanRequest = z.infer<typeof RequestLoanSchema>;

// ============================================================================
// LOAN APPROVAL SCHEMA
// ============================================================================

/**
 * Loan approval validation schema
 * 
 * Validates loan approval/rejection decision by lender.
 * 
 * @example
 * ```typescript
 * const data = {
 *   loanId: 123,
 *   approved: true,
 *   notes: 'Approved based on strong financials'
 * };
 * const result = ApproveLoanSchema.safeParse(data);
 * ```
 */
export const ApproveLoanSchema = z.object({
  loanId: z
    .number()
    .int('Loan ID must be a whole number')
    .positive('Loan ID must be positive'),
  approved: z
    .boolean(),
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional(),
  modifiedInterestRate: z
    .number()
    .positive('Interest rate must be positive')
    .min(0.1, 'Interest rate must be at least 0.1%')
    .max(50, 'Interest rate must not exceed 50%')
    .optional(),
  modifiedTermMonths: z
    .number()
    .int('Term must be a whole number of months')
    .positive('Term must be positive')
    .min(1, 'Term must be at least 1 month')
    .max(360, 'Term must not exceed 360 months')
    .optional(),
});

export type ApproveLoanRequest = z.infer<typeof ApproveLoanSchema>;

// ============================================================================
// LOAN REPAYMENT SCHEMA
// ============================================================================

/**
 * Loan repayment validation schema
 * 
 * Validates loan payment with amount and optional early payoff.
 * 
 * @example
 * ```typescript
 * const data = {
 *   loanId: 123,
 *   amount: 10000,
 *   isFullPayoff: false
 * };
 * const result = RepayLoanSchema.safeParse(data);
 * ```
 */
export const RepayLoanSchema = z.object({
  loanId: z
    .number()
    .int('Loan ID must be a whole number')
    .positive('Loan ID must be positive'),
  amount: z
    .number()
    .positive('Payment amount must be positive')
    .max(100000000, 'Payment amount must not exceed $100,000,000')
    .refine((val) => Number.isFinite(val), 'Amount must be a finite number'),
  isFullPayoff: z
    .boolean()
    .optional()
    .default(false),
});

export type RepayLoanRequest = z.infer<typeof RepayLoanSchema>;

// ============================================================================
// LOAN QUERY SCHEMAS
// ============================================================================

/**
 * List loans query validation schema
 * 
 * Query parameters for filtering and paginating loan list.
 * 
 * @example
 * ```typescript
 * const params = {
 *   status: 'active',
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'amount',
 *   sortOrder: 'desc'
 * };
 * const result = ListLoansSchema.safeParse(params);
 * ```
 */
export const ListLoansSchema = z.object({
  status: z
    .enum(['pending', 'active', 'paid', 'defaulted', 'rejected'])
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
    .enum(['amount', 'interestRate', 'termMonths', 'createdAt', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  borrowerId: z
    .number()
    .int('Borrower ID must be a whole number')
    .positive('Borrower ID must be positive')
    .optional(),
  lenderId: z
    .number()
    .int('Lender ID must be a whole number')
    .positive('Lender ID must be positive')
    .optional(),
});

export type ListLoansQuery = z.infer<typeof ListLoansSchema>;
