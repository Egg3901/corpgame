/**
 * Admin Operations Validation Schemas
 * 
 * Zod validation schemas for administrative operations including
 * user management, system configuration, moderation, and admin tools.
 * 
 * @module lib/validations/admin
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Ban user validation schema
 * 
 * Validates user ban with reason and optional expiration.
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 123,
 *   reason: 'Repeated rule violations',
 *   expiresAt: '2025-12-31T23:59:59Z',
 *   permanent: false
 * };
 * const result = BanUserSchema.safeParse(data);
 * ```
 */
export const BanUserSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date format (ISO 8601 required)')
    .optional(),
  permanent: z
    .boolean()
    .optional()
    .default(false),
  notifyUser: z
    .boolean()
    .optional()
    .default(true),
}).refine(
  (data) => {
    if (data.permanent) {
      return !data.expiresAt;
    }
    return true;
  },
  { message: 'Permanent bans cannot have expiration dates', path: ['expiresAt'] }
).refine(
  (data) => {
    if (data.expiresAt) {
      const expiresAt = new Date(data.expiresAt);
      const now = new Date();
      return expiresAt > now;
    }
    return true;
  },
  { message: 'Expiration date must be in the future', path: ['expiresAt'] }
);

export type BanUserRequest = z.infer<typeof BanUserSchema>;

/**
 * Unban user validation schema
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 123,
 *   reason: 'Appeal approved'
 * };
 * const result = UnbanUserSchema.safeParse(data);
 * ```
 */
export const UnbanUserSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  reason: z
    .string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional(),
});

export type UnbanUserRequest = z.infer<typeof UnbanUserSchema>;

/**
 * Grant admin privileges validation schema
 * 
 * @example
 * ```typescript
 * const data = {
 *   userId: 456,
 *   level: 'moderator',
 *   reason: 'Promoted for excellent community management'
 * };
 * const result = GrantAdminSchema.safeParse(data);
 * ```
 */
export const GrantAdminSchema = z.object({
  userId: z
    .number()
    .int('User ID must be a whole number')
    .positive('User ID must be positive'),
  level: z
    .enum(['moderator', 'admin', 'superadmin'])
    .default('moderator'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(200, 'Reason must not exceed 200 characters'),
});

export type GrantAdminRequest = z.infer<typeof GrantAdminSchema>;

// ============================================================================
// SYSTEM CONFIGURATION SCHEMAS
// ============================================================================

/**
 * Update system configuration validation schema
 * 
 * Validates system-wide configuration updates.
 * 
 * @example
 * ```typescript
 * const data = {
 *   key: 'MAINTENANCE_MODE',
 *   value: 'false',
 *   category: 'system'
 * };
 * const result = SystemConfigSchema.safeParse(data);
 * ```
 */
export const SystemConfigSchema = z.object({
  key: z
    .string()
    .min(1, 'Configuration key is required')
    .max(100, 'Configuration key must not exceed 100 characters')
    .regex(/^[A-Z_]+$/, 'Configuration key must be uppercase with underscores'),
  value: z
    .string()
    .max(1000, 'Configuration value must not exceed 1000 characters'),
  category: z
    .enum(['system', 'game', 'security', 'features', 'limits'])
    .default('system'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
});

export type SystemConfigRequest = z.infer<typeof SystemConfigSchema>;

/**
 * Update game speed validation schema
 * 
 * Validates game time multiplier updates.
 * 
 * @example
 * ```typescript
 * const data = {
 *   speedMultiplier: 2,
 *   reason: 'Accelerating for event'
 * };
 * const result = UpdateGameSpeedSchema.safeParse(data);
 * ```
 */
export const UpdateGameSpeedSchema = z.object({
  speedMultiplier: z
    .number()
    .positive('Speed multiplier must be positive')
    .min(0.1, 'Speed multiplier must be at least 0.1')
    .max(100, 'Speed multiplier must not exceed 100')
    .refine((val) => Number.isFinite(val), 'Speed multiplier must be a finite number'),
  reason: z
    .string()
    .max(200, 'Reason must not exceed 200 characters')
    .optional(),
});

export type UpdateGameSpeedRequest = z.infer<typeof UpdateGameSpeedSchema>;

// ============================================================================
// IP MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Ban IP address validation schema
 * 
 * @example
 * ```typescript
 * const data = {
 *   ipAddress: '192.168.1.100',
 *   reason: 'Malicious activity detected',
 *   permanent: true
 * };
 * const result = BanIpSchema.safeParse(data);
 * ```
 */
export const BanIpSchema = z.object({
  ipAddress: z
    .string()
    .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address format'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  expiresAt: z
    .string()
    .datetime('Invalid expiration date format (ISO 8601 required)')
    .optional(),
  permanent: z
    .boolean()
    .optional()
    .default(false),
});

export type BanIpRequest = z.infer<typeof BanIpSchema>;

/**
 * Unban IP address validation schema
 * 
 * @example
 * ```typescript
 * const data = {
 *   ipAddress: '192.168.1.100',
 *   reason: 'False positive'
 * };
 * const result = UnbanIpSchema.safeParse(data);
 * ```
 */
export const UnbanIpSchema = z.object({
  ipAddress: z
    .string()
    .regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/, 'Invalid IP address format'),
  reason: z
    .string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional(),
});

export type UnbanIpRequest = z.infer<typeof UnbanIpSchema>;

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

/**
 * Delete content validation schema
 * 
 * Generic schema for deleting user-generated content.
 * 
 * @example
 * ```typescript
 * const data = {
 *   contentType: 'message',
 *   contentId: 789,
 *   reason: 'Violation of community guidelines',
 *   notifyUser: true
 * };
 * const result = DeleteContentSchema.safeParse(data);
 * ```
 */
export const DeleteContentSchema = z.object({
  contentType: z
    .enum(['message', 'comment', 'post', 'report'])
    .default('message'),
  contentId: z
    .number()
    .int('Content ID must be a whole number')
    .positive('Content ID must be positive'),
  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must not exceed 500 characters'),
  notifyUser: z
    .boolean()
    .optional()
    .default(true),
});

export type DeleteContentRequest = z.infer<typeof DeleteContentSchema>;
