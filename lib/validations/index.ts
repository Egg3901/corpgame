/**
 * Validation Schemas Index
 * 
 * Central barrel export for all Zod validation schemas.
 * Provides clean imports for API routes and services.
 * 
 * @module lib/validations
 * @created 2025-12-31
 * @version 1.0.0
 * 
 * @example
 * ```typescript
 * // Single import
 * import { LoginSchema, BuySharesSchema } from '@/lib/validations';
 * 
 * // Namespace import
 * import * as validations from '@/lib/validations';
 * ```
 */

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

export {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  type LoginRequest,
  type RegisterRequest,
  type RefreshTokenRequest,
  type ChangePasswordRequest,
  type PasswordResetRequest,
  type PasswordResetConfirm,
} from './auth';

// ============================================================================
// USER SCHEMAS
// ============================================================================

export {
  UpdateProfileSchema,
  GetProfileSchema,
  CashTransferSchema,
  UpdateCashSchema,
  PortfolioQuerySchema,
  TransactionHistorySchema,
  UpdateSettingsSchema,
  type UpdateProfileRequest,
  type GetProfileQuery,
  type CashTransferRequest,
  type UpdateCashRequest,
  type PortfolioQuery,
  type TransactionHistoryQuery,
  type UpdateSettingsRequest,
} from './users';

// ============================================================================
// CORPORATION SCHEMAS
// ============================================================================

export {
  CreateCorporationSchema,
  UpdateCorporationSchema,
  AddBoardMemberSchema,
  RemoveBoardMemberSchema,
  UpdateBoardMemberSchema,
  ListCorporationsSchema,
  UpdateCapitalSchema,
  type CreateCorporationRequest,
  type UpdateCorporationRequest,
  type AddBoardMemberRequest,
  type RemoveBoardMemberRequest,
  type UpdateBoardMemberRequest,
  type ListCorporationsQuery,
  type UpdateCapitalRequest,
} from './corporations';

// ============================================================================
// SHARE TRADING SCHEMAS
// ============================================================================

export {
  BuySharesSchema,
  SellSharesSchema,
  TransferSharesSchema,
  ListSharesSchema,
  SharePriceHistorySchema,
  ShareTransactionHistorySchema,
  ShareValuationSchema,
  type BuySharesRequest,
  type SellSharesRequest,
  type TransferSharesRequest,
  type ListSharesQuery,
  type SharePriceHistoryQuery,
  type ShareTransactionHistoryQuery,
  type ShareValuationQuery,
} from './shares';

// ============================================================================
// CORPORATE ACTIONS SCHEMAS
// ============================================================================

export {
  DeclareDividendSchema,
  CancelDividendSchema,
  CreateVoteSchema,
  CastVoteSchema,
  CapitalRaiseSchema,
  ParticipateCapitalRaiseSchema,
  StockSplitSchema,
  type DeclareDividendRequest,
  type CancelDividendRequest,
  type CreateVoteRequest,
  type CastVoteRequest,
  type CapitalRaiseRequest,
  type ParticipateCapitalRaiseRequest,
  type StockSplitRequest,
} from './corporate-actions';

// ============================================================================
// LOAN SCHEMAS
// ============================================================================

export {
  RequestLoanSchema,
  ApproveLoanSchema,
  RepayLoanSchema,
  ListLoansSchema,
  type RequestLoanRequest,
  type ApproveLoanRequest,
  type RepayLoanRequest,
  type ListLoansQuery,
} from './loans';

// ============================================================================
// PRODUCT SCHEMAS
// ============================================================================

export {
  CreateProductSchema,
  UpdateProductSchema,
  DeleteProductSchema,
  ListProductsSchema,
  type CreateProductRequest,
  type UpdateProductRequest,
  type DeleteProductRequest,
  type ListProductsQuery,
} from './products';

// ============================================================================
// COMMODITY SCHEMAS
// ============================================================================

export {
  UpdateCommodityPriceSchema,
  TradeCommoditySchema,
  ListCommoditiesSchema,
  CommodityPriceHistorySchema,
  type UpdateCommodityPriceRequest,
  type TradeCommodityRequest,
  type ListCommoditiesQuery,
  type CommodityPriceHistoryQuery,
} from './commodities';

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export {
  BanUserSchema,
  UnbanUserSchema,
  GrantAdminSchema,
  SystemConfigSchema,
  UpdateGameSpeedSchema,
  BanIpSchema,
  UnbanIpSchema,
  DeleteContentSchema,
  type BanUserRequest,
  type UnbanUserRequest,
  type GrantAdminRequest,
  type SystemConfigRequest,
  type UpdateGameSpeedRequest,
  type BanIpRequest,
  type UnbanIpRequest,
  type DeleteContentRequest,
} from './admin';
