// Predefined list of corporation sectors
export const SECTORS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Energy',
  'Retail',
  'Real Estate',
  'Transportation',
  'Media',
  'Telecommunications',
  'Agriculture',
  'Defense',
  'Hospitality',
  'Construction',
  'Pharmaceuticals',
] as const;

export type Sector = typeof SECTORS[number];

// Validate if a string is a valid sector
export function isValidSector(value: string): value is Sector {
  return SECTORS.includes(value as Sector);
}

// US States for HQ location
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
] as const;

export type USStateCode = typeof US_STATES[number]['value'];

// Get all valid state codes
export const US_STATE_CODES = US_STATES.map(s => s.value);

// Validate if a string is a valid US state code
export function isValidStateCode(value: string): value is USStateCode {
  return US_STATE_CODES.includes(value as USStateCode);
}

// Get state label from code
export function getStateLabel(code: string): string | undefined {
  return US_STATES.find(s => s.value === code)?.label;
}

// US Regions mapping
export const US_REGIONS = {
  'West': ['CA', 'WA', 'OR', 'NV', 'AZ', 'UT', 'CO', 'NM', 'HI', 'AK', 'ID', 'MT', 'WY'],
  'Southwest': ['TX', 'OK'],
  'Midwest': ['IL', 'OH', 'MI', 'IN', 'WI', 'MN', 'MO', 'IA', 'KS', 'NE', 'SD', 'ND'],
  'Southeast': ['FL', 'GA', 'NC', 'VA', 'TN', 'SC', 'AL', 'KY', 'LA', 'MS', 'AR', 'WV'],
  'Northeast': ['NY', 'PA', 'NJ', 'MA', 'MD', 'CT', 'NH', 'ME', 'RI', 'VT', 'DE'],
} as const;

export type USRegion = keyof typeof US_REGIONS;

// Get region for a state code
export function getStateRegion(stateCode: string): USRegion | undefined {
  for (const [region, states] of Object.entries(US_REGIONS)) {
    if ((states as readonly string[]).includes(stateCode)) {
      return region as USRegion;
    }
  }
  return undefined;
}

// State population multipliers for revenue calculations (1.0 - 5.0)
export const STATE_MULTIPLIERS: Record<string, number> = {
  // West
  'CA': 5.00, 'WA': 2.50, 'OR': 1.50, 'NV': 1.20, 'AZ': 2.40,
  'UT': 1.20, 'CO': 2.00, 'NM': 1.00, 'HI': 1.00, 'AK': 1.00,
  'ID': 1.00, 'MT': 1.00, 'WY': 1.00,
  // Southwest
  'TX': 4.50, 'OK': 1.40,
  // Midwest
  'IL': 3.80, 'OH': 3.50, 'MI': 3.00, 'IN': 2.10, 'WI': 1.90,
  'MN': 1.80, 'MO': 1.90, 'IA': 1.10, 'KS': 1.10, 'NE': 1.00,
  'SD': 1.00, 'ND': 1.00,
  // Southeast
  'FL': 3.50, 'GA': 3.30, 'NC': 3.20, 'VA': 2.70, 'TN': 2.20,
  'SC': 1.70, 'AL': 1.60, 'KY': 1.50, 'LA': 1.50, 'MS': 1.10,
  'AR': 1.10, 'WV': 1.00,
  // Northeast
  'NY': 4.00, 'PA': 3.80, 'NJ': 2.90, 'MA': 2.20, 'MD': 1.95,
  'CT': 1.20, 'NH': 1.00, 'ME': 1.00, 'RI': 1.00, 'VT': 1.00,
  'DE': 1.00,
};

// Get multiplier for a state code (defaults to 1.0)
export function getStateMultiplier(stateCode: string): number {
  return STATE_MULTIPLIERS[stateCode] || 1.0;
}

// Business unit types
export const UNIT_TYPES = ['retail', 'production', 'service'] as const;
export type UnitType = typeof UNIT_TYPES[number];

// Unit economics - hourly rates
export const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
} as const;

// Display period multiplier (96 hours = 4 days)
export const DISPLAY_PERIOD_HOURS = 96;

// Market entry cost
export const MARKET_ENTRY_COST = 50000;
export const MARKET_ENTRY_ACTIONS = 1;

// Build unit cost
export const BUILD_UNIT_COST = 10000;
export const BUILD_UNIT_ACTIONS = 1;

// Stock Valuation Constants
export const STOCK_VALUATION = {
  // Minimum share price floor
  MIN_SHARE_PRICE: 0.01,
  
  // P/E ratio for valuing business units (10x annual earnings)
  UNIT_PE_RATIO: 10,
  
  // Hours per year for annualizing hourly profits
  HOURS_PER_YEAR: 8760,
  
  // Weight for fundamental value vs trade activity in price calculation
  FUNDAMENTAL_WEIGHT: 0.80,
  TRADE_WEIGHT: 0.20,
  
  // Recency decay factor for trade weighting (higher = more recent trades weighted more)
  RECENCY_DECAY: 0.95,
  
  // Hours to look back for trade activity
  TRADE_LOOKBACK_HOURS: 168, // 1 week
  
  // Random hourly variation (±5%)
  HOURLY_VARIATION_PERCENT: 0.05,
} as const;

// Calculate asset value per unit based on annual profit capitalization
export function getUnitAssetValue(unitType: UnitType, stateMultiplier: number): number {
  const economics = UNIT_ECONOMICS[unitType];
  const hourlyProfit = (economics.baseRevenue * stateMultiplier) - economics.baseCost;
  const annualProfit = hourlyProfit * STOCK_VALUATION.HOURS_PER_YEAR;
  // Value = Annual Profit * P/E Ratio
  return annualProfit * STOCK_VALUATION.UNIT_PE_RATIO;
}
