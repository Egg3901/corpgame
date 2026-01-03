export const ACTIONS_CONFIG = {
  // Limits
  MAX_ACTIONS_DEFAULT: 20,
  MAX_ACTIONS_CEO: 30, // CEOs get a higher cap

  // Replenishment (Hourly)
  HOURLY_REPLENISHMENT: 2,
  HOURLY_CEO_BONUS: 1,

  // Costs
  COSTS: {
    MARKET_ENTRY: 2, // Increased from 1 to make expansion more significant
    BUILD_UNIT: 1,
    ABANDON_SECTOR: 5, // New cost for leaving a market
    SPECIAL_ACTION: 3, // Placeholder for future special actions
    NAME_CHANGE: 10, // Cost to change corporation name
  }
} as const;
