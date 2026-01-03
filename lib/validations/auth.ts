/**
 * Authentication Validation Schemas
 * 
 * Zod validation schemas for authentication-related API routes including
 * login, registration, token refresh, and password management.
 * 
 * @module lib/validations/auth
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// SHARED VALIDATION RULES
// ============================================================================

/**
 * Username validation rules
 * - 3-30 characters
 * - Alphanumeric with underscores
 * - No special characters
 */
const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/**
 * Email validation rules
 * - Standard email format
 * - Case-insensitive
 */
const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must not exceed 255 characters');

/**
 * Password validation rules
 * - 8-100 characters
 * - Must contain uppercase, lowercase, number, special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ============================================================================
// LOGIN SCHEMA
// ============================================================================

/**
 * Login request validation schema
 * 
 * Accepts either email OR username along with password.
 * At least one identifier (email/username) must be provided.
 * 
 * @example
 * ```typescript
 * // Login with email
 * const data = { email: 'user@example.com', password: 'SecurePass123!' };
 * const result = LoginSchema.safeParse(data);
 * 
 * // Login with username
 * const data = { username: 'john_doe', password: 'SecurePass123!' };
 * const result = LoginSchema.safeParse(data);
 * ```
 */
export const LoginSchema = z.object({
  email: emailSchema.optional(),
  username: usernameSchema.optional(),
  password: z.string().min(1, 'Password is required'),
}).refine(
  (data) => data.email || data.username,
  { message: 'Either email or username must be provided', path: ['email'] }
);

export type LoginRequest = z.infer<typeof LoginSchema>;

// ============================================================================
// REGISTER SCHEMA
// ============================================================================

/**
 * User registration validation schema
 * 
 * Requires username, email, password, and optional profile information.
 * Password must meet complexity requirements.
 * 
 * @example
 * ```typescript
 * const data = {
 *   username: 'john_doe',
 *   email: 'john@example.com',
 *   password: 'SecurePass123!',
 *   player_name: 'John Doe',
 *   gender: 'Male',
 *   age: 30
 * };
 * const result = RegisterSchema.safeParse(data);
 * ```
 */
export const RegisterSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  player_name: z
    .string()
    .min(1, 'Player name is required')
    .max(100, 'Player name must not exceed 100 characters')
    .optional(),
  gender: z
    .enum(['m', 'f', 'nonbinary'])
    .optional(),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old')
    .max(120, 'Age must not exceed 120')
    .optional(),
  starting_state: z
    .string()
    .min(1, 'Starting state is required')
    .max(100, 'Starting state must not exceed 100 characters')
    .optional(),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

// ============================================================================
// REFRESH TOKEN SCHEMA
// ============================================================================

/**
 * Token refresh validation schema
 * 
 * Validates refresh token request for obtaining new access tokens.
 * 
 * @example
 * ```typescript
 * const data = { refreshToken: 'eyJhbGciOiJIUzI1NiIs...' };
 * const result = RefreshTokenSchema.safeParse(data);
 * ```
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;

// ============================================================================
// PASSWORD CHANGE SCHEMA
// ============================================================================

/**
 * Password change validation schema
 * 
 * Requires current password and new password meeting complexity requirements.
 * New password must be different from current password.
 * 
 * @example
 * ```typescript
 * const data = {
 *   currentPassword: 'OldPass123!',
 *   newPassword: 'NewSecurePass456@'
 * };
 * const result = ChangePasswordSchema.safeParse(data);
 * ```
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password', path: ['newPassword'] }
);

export type ChangePasswordRequest = z.infer<typeof ChangePasswordSchema>;

// ============================================================================
// PASSWORD RESET SCHEMA
// ============================================================================

/**
 * Password reset request validation schema
 * 
 * Initiates password reset by email.
 * 
 * @example
 * ```typescript
 * const data = { email: 'user@example.com' };
 * const result = PasswordResetRequestSchema.safeParse(data);
 * ```
 */
export const PasswordResetRequestSchema = z.object({
  email: emailSchema,
});

export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

/**
 * Password reset confirmation validation schema
 * 
 * Completes password reset with token and new password.
 * 
 * @example
 * ```typescript
 * const data = {
 *   token: 'reset-token-here',
 *   newPassword: 'NewSecurePass123!'
 * };
 * const result = PasswordResetConfirmSchema.safeParse(data);
 * ```
 */
export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;
