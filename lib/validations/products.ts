/**
 * Product Operations Validation Schemas
 * 
 * Zod validation schemas for product-related operations including
 * product creation, updates, deletion, and pricing management.
 * 
 * @module lib/validations/products
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// PRODUCT CREATION SCHEMA
// ============================================================================

/**
 * Create product validation schema
 * 
 * Validates product creation with name, category, pricing, and specifications.
 * 
 * @example
 * ```typescript
 * const data = {
 *   name: 'Premium Widget',
 *   category: 'Electronics',
 *   basePrice: 299.99,
 *   description: 'High-quality electronic widget'
 * };
 * const result = CreateProductSchema.safeParse(data);
 * ```
 */
export const CreateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must not exceed 100 characters'),
  category: z
    .string()
    .min(1, 'Category is required')
    .max(50, 'Category must not exceed 50 characters'),
  basePrice: z
    .number()
    .positive('Base price must be positive')
    .max(1000000, 'Base price must not exceed $1,000,000')
    .refine((val) => Number.isFinite(val), 'Price must be a finite number'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  specifications: z
    .record(z.string(), z.any())
    .optional(),
});

export type CreateProductRequest = z.infer<typeof CreateProductSchema>;

// ============================================================================
// PRODUCT UPDATE SCHEMA
// ============================================================================

/**
 * Update product validation schema
 * 
 * Allows partial updates to product information.
 * All fields are optional.
 * 
 * @example
 * ```typescript
 * const data = {
 *   name: 'Premium Widget Pro',
 *   basePrice: 349.99,
 *   description: 'Enhanced version'
 * };
 * const result = UpdateProductSchema.safeParse(data);
 * ```
 */
export const UpdateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Product name must be at least 3 characters')
    .max(100, 'Product name must not exceed 100 characters')
    .optional(),
  category: z
    .string()
    .min(1, 'Category cannot be empty')
    .max(50, 'Category must not exceed 50 characters')
    .optional(),
  basePrice: z
    .number()
    .positive('Base price must be positive')
    .max(1000000, 'Base price must not exceed $1,000,000')
    .refine((val) => Number.isFinite(val), 'Price must be a finite number')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  specifications: z
    .record(z.string(), z.any())
    .optional(),
  isActive: z
    .boolean()
    .optional(),
});

export type UpdateProductRequest = z.infer<typeof UpdateProductSchema>;

// ============================================================================
// PRODUCT DELETE SCHEMA
// ============================================================================

/**
 * Delete product validation schema
 * 
 * Optional soft delete with reason.
 * 
 * @example
 * ```typescript
 * const data = {
 *   productId: 456,
 *   reason: 'Product discontinued',
 *   softDelete: true
 * };
 * const result = DeleteProductSchema.safeParse(data);
 * ```
 */
export const DeleteProductSchema = z.object({
  productId: z
    .number()
    .int('Product ID must be a whole number')
    .positive('Product ID must be positive'),
  reason: z
    .string()
    .max(200, 'Reason must not exceed 200 characters')
    .optional(),
  softDelete: z
    .boolean()
    .optional()
    .default(true),
});

export type DeleteProductRequest = z.infer<typeof DeleteProductSchema>;

// ============================================================================
// PRODUCT QUERY SCHEMAS
// ============================================================================

/**
 * List products query validation schema
 * 
 * Query parameters for filtering, sorting, and paginating product list.
 * 
 * @example
 * ```typescript
 * const params = {
 *   category: 'Electronics',
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'price',
 *   sortOrder: 'asc'
 * };
 * const result = ListProductsSchema.safeParse(params);
 * ```
 */
export const ListProductsSchema = z.object({
  category: z
    .string()
    .max(50, 'Category must not exceed 50 characters')
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
    .enum(['name', 'price', 'category', 'createdAt'])
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
  isActive: z
    .boolean()
    .optional(),
});

export type ListProductsQuery = z.infer<typeof ListProductsSchema>;
