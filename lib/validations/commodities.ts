/**
 * Commodity Operations Validation Schemas
 * 
 * Zod validation schemas for commodity-related operations including
 * pricing, trading, market operations, and commodity management.
 * 
 * @module lib/validations/commodities
 * @created 2025-12-31
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// COMMODITY PRICING SCHEMA
// ============================================================================

/**
 * Update commodity price validation schema
 * 
 * Validates commodity price updates with current price and optional metadata.
 * 
 * @example
 * ```typescript
 * const data = {
 *   commodityId: 1,
 *   currentPrice: 850.50,
 *   volume: 1000,
 *   source: 'market'
 * };
 * const result = UpdateCommodityPriceSchema.safeParse(data);
 * ```
 */
export const UpdateCommodityPriceSchema = z.object({
  commodityId: z
    .number()
    .int('Commodity ID must be a whole number')
    .positive('Commodity ID must be positive'),
  currentPrice: z
    .number()
    .positive('Price must be positive')
    .max(1000000, 'Price must not exceed $1,000,000')
    .refine((val) => Number.isFinite(val), 'Price must be a finite number'),
  volume: z
    .number()
    .int('Volume must be a whole number')
    .min(0, 'Volume cannot be negative')
    .optional(),
  source: z
    .enum(['market', 'admin', 'automated'])
    .optional()
    .default('market'),
});

export type UpdateCommodityPriceRequest = z.infer<typeof UpdateCommodityPriceSchema>;

// ============================================================================
// COMMODITY TRADING SCHEMA
// ============================================================================

/**
 * Trade commodity validation schema
 * 
 * Validates commodity trading with quantity and price.
 * 
 * @example
 * ```typescript
 * const data = {
 *   commodityId: 1,
 *   quantity: 500,
 *   pricePerUnit: 850,
 *   tradeType: 'buy'
 * };
 * const result = TradeCommoditySchema.safeParse(data);
 * ```
 */
export const TradeCommoditySchema = z.object({
  commodityId: z
    .number()
    .int('Commodity ID must be a whole number')
    .positive('Commodity ID must be positive'),
  quantity: z
    .number()
    .positive('Quantity must be positive')
    .max(1000000, 'Quantity must not exceed 1,000,000 units')
    .refine((val) => Number.isFinite(val), 'Quantity must be a finite number'),
  pricePerUnit: z
    .number()
    .positive('Price per unit must be positive')
    .max(1000000, 'Price per unit must not exceed $1,000,000')
    .refine((val) => Number.isFinite(val), 'Price must be a finite number')
    .optional(),
  tradeType: z
    .enum(['buy', 'sell'])
    .default('buy'),
});

export type TradeCommodityRequest = z.infer<typeof TradeCommoditySchema>;

// ============================================================================
// COMMODITY QUERY SCHEMAS
// ============================================================================

/**
 * List commodities query validation schema
 * 
 * Query parameters for filtering and paginating commodity list.
 * 
 * @example
 * ```typescript
 * const params = {
 *   category: 'Metals',
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'price',
 *   sortOrder: 'desc'
 * };
 * const result = ListCommoditiesSchema.safeParse(params);
 * ```
 */
export const ListCommoditiesSchema = z.object({
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
    .enum(['name', 'price', 'category', 'volume'])
    .optional()
    .default('name'),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('asc'),
});

export type ListCommoditiesQuery = z.infer<typeof ListCommoditiesSchema>;

/**
 * Commodity price history query validation schema
 * 
 * Query parameters for retrieving historical commodity price data.
 * 
 * @example
 * ```typescript
 * const params = {
 *   commodityId: 1,
 *   startDate: '2025-01-01T00:00:00Z',
 *   endDate: '2025-12-31T23:59:59Z',
 *   interval: 'day'
 * };
 * const result = CommodityPriceHistorySchema.safeParse(params);
 * ```
 */
export const CommodityPriceHistorySchema = z.object({
  commodityId: z
    .number()
    .int('Commodity ID must be a whole number')
    .positive('Commodity ID must be positive'),
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

export type CommodityPriceHistoryQuery = z.infer<typeof CommodityPriceHistorySchema>;
