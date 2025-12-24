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

// ============================================================================
// RESOURCES SYSTEM
// ============================================================================

// Resource types that production units can demand
export const RESOURCES = [
  'Oil',
  'Steel',
  'Rare Earth',
  'Copper',
  'Fertile Land',
  'Lumber',
  'Chemical Compounds',
] as const;

export type Resource = typeof RESOURCES[number];

// Mapping of sectors to their required resource (null = no resource required)
export const SECTOR_RESOURCES: Record<Sector, Resource | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Manufacturing': 'Steel',
  'Energy': 'Oil',
  'Retail': null,
  'Real Estate': null,
  'Transportation': 'Steel',
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': 'Steel',
  'Hospitality': null,
  'Construction': 'Lumber',
  'Pharmaceuticals': 'Chemical Compounds',
};

// Get the resource required by a sector
export function getSectorResource(sector: Sector): Resource | null {
  return SECTOR_RESOURCES[sector];
}

// Check if a sector requires resources
export function sectorRequiresResource(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  return SECTOR_RESOURCES[sector] !== null;
}

// ============================================================================
// STATE RESOURCE POOLS
// Realistic distribution of resources across US states
// Values represent available resource units in each state
// ============================================================================

export type StateResourcePool = Partial<Record<Resource, number>>;

export const STATE_RESOURCES: Record<string, StateResourcePool> = {
  // ---- WEST ----
  'CA': {
    'Rare Earth': 2000,      // Mountain Pass mine - largest US deposit
    'Oil': 200,              // Some production, declining
    'Fertile Land': 4000,    // Central Valley agriculture
    'Lumber': 1500,          // Northern California forests
    'Chemical Compounds': 1500,
  },
  'WA': {
    'Lumber': 6000,          // Major timber state
    'Fertile Land': 1800,    // Eastern WA agriculture
  },
  'OR': {
    'Lumber': 8000,          // #1 lumber producer
    'Fertile Land': 1200,
  },
  'NV': {
    'Copper': 1500,          // Significant mining
    'Rare Earth': 100,
  },
  'AZ': {
    'Copper': 10000,         // Dominant - 65%+ of US copper
  },
  'UT': {
    'Copper': 3000,          // Bingham Canyon mine
    'Oil': 100,
  },
  'CO': {
    'Oil': 700,              // DJ Basin
    'Fertile Land': 800,
  },
  'NM': {
    'Oil': 1200,             // Permian Basin extends here
    'Copper': 2000,
    'Chemical Compounds': 200,
  },
  'HI': {
    'Fertile Land': 300,     // Limited but specialized agriculture
  },
  'AK': {
    'Oil': 600,              // North Slope (remote)
    'Lumber': 400,
  },
  'ID': {
    'Lumber': 2000,
    'Rare Earth': 200,
    'Fertile Land': 1500,
  },
  'MT': {
    'Copper': 1000,
    'Lumber': 1500,
    'Oil': 80,
    'Rare Earth': 150,
    'Fertile Land': 1000,
  },
  'WY': {
    'Oil': 500,
    'Chemical Compounds': 2000,  // Trona/soda ash - world's largest
    'Rare Earth': 500,
    'Fertile Land': 400,
  },

  // ---- SOUTHWEST ----
  'TX': {
    'Oil': 5000,             // Dominant US oil producer
    'Chemical Compounds': 8000, // Gulf Coast petrochemical hub
    'Fertile Land': 3500,
    'Rare Earth': 300,
    'Steel': 100,            // Some iron ore
  },
  'OK': {
    'Oil': 800,
    'Fertile Land': 1000,
    'Chemical Compounds': 300,
  },

  // ---- MIDWEST ----
  'IL': {
    'Fertile Land': 7000,    // Corn Belt powerhouse
    'Chemical Compounds': 500,
    'Steel': 50,
  },
  'OH': {
    'Steel': 50,             // Historical steel industry
    'Fertile Land': 3000,
    'Chemical Compounds': 800,
    'Oil': 50,
  },
  'MI': {
    'Steel': 2000,           // Iron Range extends here
    'Copper': 500,           // Keweenaw Peninsula (historical)
    'Lumber': 600,
    'Fertile Land': 1200,
  },
  'IN': {
    'Fertile Land': 4000,
    'Steel': 30,
    'Chemical Compounds': 200,
  },
  'WI': {
    'Steel': 500,            // Iron ore deposits
    'Lumber': 800,
    'Fertile Land': 1500,
  },
  'MN': {
    'Steel': 5000,           // Iron Range - dominant US source
    'Fertile Land': 5000,
    'Lumber': 400,
  },
  'MO': {
    'Fertile Land': 2500,
    'Chemical Compounds': 150,
  },
  'IA': {
    'Fertile Land': 8000,    // #1 agricultural state
  },
  'KS': {
    'Fertile Land': 6000,    // Major wheat producer
    'Oil': 150,
    'Chemical Compounds': 100,
  },
  'NE': {
    'Fertile Land': 5500,    // Corn Belt
  },
  'SD': {
    'Fertile Land': 2000,
    'Rare Earth': 50,
  },
  'ND': {
    'Oil': 1500,             // Bakken Formation
    'Fertile Land': 2000,
  },

  // ---- SOUTHEAST ----
  'FL': {
    'Chemical Compounds': 3000, // Phosphate mining
    'Fertile Land': 1000,
    'Lumber': 500,
  },
  'GA': {
    'Lumber': 4000,          // Major timber state
    'Fertile Land': 400,
  },
  'NC': {
    'Lumber': 2500,
    'Fertile Land': 500,
  },
  'VA': {
    'Lumber': 700,
    'Fertile Land': 400,
    'Chemical Compounds': 100,
  },
  'TN': {
    'Lumber': 600,
    'Fertile Land': 500,
    'Chemical Compounds': 200,
  },
  'SC': {
    'Lumber': 800,
    'Fertile Land': 300,
  },
  'AL': {
    'Steel': 300,            // Birmingham iron/steel history
    'Lumber': 3500,
    'Chemical Compounds': 200,
  },
  'KY': {
    'Fertile Land': 600,
    'Lumber': 400,
    'Chemical Compounds': 150,
  },
  'LA': {
    'Oil': 400,
    'Chemical Compounds': 6000, // Major petrochemical corridor
    'Lumber': 1000,
    'Fertile Land': 500,
  },
  'MS': {
    'Lumber': 3000,
    'Fertile Land': 400,
    'Oil': 30,
  },
  'AR': {
    'Lumber': 1200,
    'Fertile Land': 800,
  },
  'WV': {
    'Lumber': 500,
    'Chemical Compounds': 300,
  },

  // ---- NORTHEAST ----
  'NY': {
    'Fertile Land': 600,
    'Lumber': 300,
  },
  'PA': {
    'Steel': 200,            // Historical steel industry
    'Lumber': 400,
    'Chemical Compounds': 600,
    'Oil': 20,               // First US oil well was here
  },
  'NJ': {
    'Chemical Compounds': 1000, // Major chemical industry
  },
  'MA': {
    // Limited natural resources
  },
  'MD': {
    'Fertile Land': 200,
  },
  'CT': {
    // Limited natural resources
  },
  'NH': {
    'Lumber': 300,
  },
  'ME': {
    'Lumber': 2500,          // Major timber state
  },
  'RI': {
    // Limited natural resources
  },
  'VT': {
    'Lumber': 200,
    'Fertile Land': 100,
  },
  'DE': {
    'Chemical Compounds': 200, // DuPont legacy
  },
};

// Get resource pool for a state
export function getStateResources(stateCode: string): StateResourcePool {
  return STATE_RESOURCES[stateCode] || {};
}

// Get available amount of a specific resource in a state
export function getStateResourceAmount(stateCode: string, resource: Resource): number {
  return STATE_RESOURCES[stateCode]?.[resource] || 0;
}

// Check if a state has a specific resource
export function stateHasResource(stateCode: string, resource: Resource): boolean {
  return getStateResourceAmount(stateCode, resource) > 0;
}

// Get total US pool for a resource
export function getTotalResourcePool(resource: Resource): number {
  let total = 0;
  for (const stateCode of Object.keys(STATE_RESOURCES)) {
    total += STATE_RESOURCES[stateCode]?.[resource] || 0;
  }
  return total;
}

// Get all states that have a specific resource, sorted by amount (descending)
export function getStatesWithResource(resource: Resource): Array<{ stateCode: string; amount: number }> {
  const states: Array<{ stateCode: string; amount: number }> = [];
  
  for (const [stateCode, resources] of Object.entries(STATE_RESOURCES)) {
    const amount = resources[resource];
    if (amount && amount > 0) {
      states.push({ stateCode, amount });
    }
  }
  
  return states.sort((a, b) => b.amount - a.amount);
}

// ============================================================================
// PRODUCTION EFFICIENCY CALCULATION
// ============================================================================

export interface ResourceEfficiencyResult {
  efficiency: number;           // 0.0 to 1.0
  availableResources: number;   // How many resource units available in state
  requiredResources: number;    // How many resource units needed (production unit count)
  resourceType: Resource | null; // The resource type required (null if sector needs none)
  hasShortage: boolean;         // True if efficiency < 1.0
}

/**
 * Calculate production efficiency for a sector in a state
 * Efficiency = min(1, available_resources / required_resources)
 * 
 * @param stateCode - The US state code
 * @param sector - The sector type
 * @param productionUnitCount - Number of production units operating
 * @returns Efficiency calculation result
 */
export function calculateResourceEfficiency(
  stateCode: string,
  sector: string,
  productionUnitCount: number
): ResourceEfficiencyResult {
  // If sector doesn't require resources, always 100% efficient
  if (!isValidSector(sector)) {
    return {
      efficiency: 1.0,
      availableResources: 0,
      requiredResources: 0,
      resourceType: null,
      hasShortage: false,
    };
  }

  const resourceType = SECTOR_RESOURCES[sector];
  
  // Sectors without resource requirements are always efficient
  if (resourceType === null) {
    return {
      efficiency: 1.0,
      availableResources: 0,
      requiredResources: 0,
      resourceType: null,
      hasShortage: false,
    };
  }

  // No production units = no requirements = 100% efficient
  if (productionUnitCount <= 0) {
    return {
      efficiency: 1.0,
      availableResources: getStateResourceAmount(stateCode, resourceType),
      requiredResources: 0,
      resourceType,
      hasShortage: false,
    };
  }

  const availableResources = getStateResourceAmount(stateCode, resourceType);
  const requiredResources = productionUnitCount; // 1 resource per production unit
  
  // Efficiency formula: min(1, available / required)
  const efficiency = Math.min(1.0, availableResources / requiredResources);
  
  return {
    efficiency,
    availableResources,
    requiredResources,
    resourceType,
    hasShortage: efficiency < 1.0,
  };
}

/**
 * Calculate the effective revenue multiplier including resource efficiency
 * 
 * @param stateCode - The US state code  
 * @param sector - The sector type
 * @param productionUnitCount - Number of production units
 * @returns Combined multiplier (state multiplier * resource efficiency)
 */
export function getEffectiveMultiplier(
  stateCode: string,
  sector: string,
  productionUnitCount: number
): number {
  const stateMultiplier = getStateMultiplier(stateCode);
  const { efficiency } = calculateResourceEfficiency(stateCode, sector, productionUnitCount);
  return stateMultiplier * efficiency;
}

// ============================================================================
// US STATES & REGIONS
// ============================================================================

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
];

// Get all valid state codes
export const US_STATE_CODES = US_STATES.map(s => s.value);

// Validate if a string is a valid US state code
export function isValidStateCode(value: string): boolean {
  return US_STATE_CODES.includes(value);
}

// Get state label from code
export function getStateLabel(code: string): string | undefined {
  return US_STATES.find(s => s.value === code)?.label;
}

// US Regions mapping
export const US_REGIONS: Record<string, string[]> = {
  'West': ['CA', 'WA', 'OR', 'NV', 'AZ', 'UT', 'CO', 'NM', 'HI', 'AK', 'ID', 'MT', 'WY'],
  'Southwest': ['TX', 'OK'],
  'Midwest': ['IL', 'OH', 'MI', 'IN', 'WI', 'MN', 'MO', 'IA', 'KS', 'NE', 'SD', 'ND'],
  'Southeast': ['FL', 'GA', 'NC', 'VA', 'TN', 'SC', 'AL', 'KY', 'LA', 'MS', 'AR', 'WV'],
  'Northeast': ['NY', 'PA', 'NJ', 'MA', 'MD', 'CT', 'NH', 'ME', 'RI', 'VT', 'DE'],
};

// Get region for a state code
export function getStateRegion(stateCode: string): string | undefined {
  for (const [region, states] of Object.entries(US_REGIONS)) {
    if (states.includes(stateCode)) {
      return region;
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

// ============================================================================
// BUSINESS UNIT ECONOMICS
// ============================================================================

// Business unit types
export const UNIT_TYPES = ['retail', 'production', 'service'] as const;
export type UnitType = typeof UNIT_TYPES[number];

// Unit economics - hourly rates
export const UNIT_ECONOMICS: Record<UnitType, { baseRevenue: number; baseCost: number }> = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
};

// Display period multiplier (96 hours = 4 days)
export const DISPLAY_PERIOD_HOURS = 96;

// Market entry cost
export const MARKET_ENTRY_COST = 50000;
export const MARKET_ENTRY_ACTIONS = 1;

// Build unit cost
export const BUILD_UNIT_COST = 10000;
export const BUILD_UNIT_ACTIONS = 1;

// ============================================================================
// STOCK VALUATION
// ============================================================================

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
};

// Calculate asset value per unit based on annual profit capitalization
export function getUnitAssetValue(unitType: UnitType, stateMultiplier: number): number {
  const economics = UNIT_ECONOMICS[unitType];
  const hourlyProfit = (economics.baseRevenue * stateMultiplier) - economics.baseCost;
  const annualProfit = hourlyProfit * STOCK_VALUATION.HOURS_PER_YEAR;
  // Value = Annual Profit * P/E Ratio
  return annualProfit * STOCK_VALUATION.UNIT_PE_RATIO;
}

// ============================================================================
// RESOURCE SUMMARY HELPERS
// ============================================================================

// Get a summary of all resources and their total US pools
export function getResourceSummary(): Record<Resource, { totalPool: number; stateCount: number }> {
  const summary: Record<Resource, { totalPool: number; stateCount: number }> = {} as any;
  
  for (const resource of RESOURCES) {
    const states = getStatesWithResource(resource);
    summary[resource] = {
      totalPool: getTotalResourcePool(resource),
      stateCount: states.length,
    };
  }
  
  return summary;
}

// Get resource availability info for display
export function getResourceInfo(resource: Resource): {
  name: Resource;
  totalPool: number;
  topStates: Array<{ stateCode: string; stateName: string; amount: number; percentage: number }>;
} {
  const totalPool = getTotalResourcePool(resource);
  const states = getStatesWithResource(resource).slice(0, 5); // Top 5
  
  return {
    name: resource,
    totalPool,
    topStates: states.map(s => ({
      stateCode: s.stateCode,
      stateName: getStateLabel(s.stateCode) || s.stateCode,
      amount: s.amount,
      percentage: totalPool > 0 ? (s.amount / totalPool) * 100 : 0,
    })),
  };
}

// ============================================================================
// COMMODITY PRICING
// Price is calculated based on scarcity (inverse of availability)
// ============================================================================

// Base prices for each resource (in dollars per unit)
export const RESOURCE_BASE_PRICES: Record<Resource, number> = {
  'Oil': 75,                    // Per barrel equivalent
  'Steel': 850,                 // Per ton equivalent
  'Rare Earth': 125000,         // Per ton (very expensive)
  'Copper': 8500,               // Per ton
  'Fertile Land': 3500,         // Per acre equivalent
  'Lumber': 450,                // Per thousand board feet
  'Chemical Compounds': 2200,   // Per ton
};

// Reference pool sizes for "normal" pricing (prices adjust based on deviation from these)
const REFERENCE_POOL_SIZES: Record<Resource, number> = {
  'Oil': 12000,
  'Steel': 10000,
  'Rare Earth': 4000,
  'Copper': 20000,
  'Fertile Land': 60000,
  'Lumber': 40000,
  'Chemical Compounds': 25000,
};

export interface CommodityPrice {
  resource: Resource;
  basePrice: number;
  currentPrice: number;
  priceChange: number;          // Percentage change from base
  totalSupply: number;
  scarcityFactor: number;       // < 1 = abundant, > 1 = scarce
  topProducers: Array<{
    stateCode: string;
    stateName: string;
    amount: number;
    percentage: number;
  }>;
  demandingSectors: Sector[];
}

/**
 * Calculate commodity price based on scarcity
 * Price = BasePrice * ScarcityFactor
 * ScarcityFactor = ReferencePoolSize / ActualPoolSize
 * 
 * When supply is low, price goes up (scarcity > 1)
 * When supply is high, price goes down (scarcity < 1)
 */
export function calculateCommodityPrice(resource: Resource): CommodityPrice {
  const basePrice = RESOURCE_BASE_PRICES[resource];
  const totalSupply = getTotalResourcePool(resource);
  const referencePool = REFERENCE_POOL_SIZES[resource];
  
  // Calculate scarcity factor (clamped between 0.5 and 3.0)
  const rawScarcity = totalSupply > 0 ? referencePool / totalSupply : 3.0;
  const scarcityFactor = Math.min(3.0, Math.max(0.5, rawScarcity));
  
  // Calculate current price
  const currentPrice = Math.round(basePrice * scarcityFactor * 100) / 100;
  
  // Calculate price change percentage from base
  const priceChange = ((currentPrice - basePrice) / basePrice) * 100;
  
  // Get top producing states
  const topStates = getStatesWithResource(resource).slice(0, 5);
  const topProducers = topStates.map(s => ({
    stateCode: s.stateCode,
    stateName: getStateLabel(s.stateCode) || s.stateCode,
    amount: s.amount,
    percentage: totalSupply > 0 ? (s.amount / totalSupply) * 100 : 0,
  }));
  
  // Get sectors that demand this resource
  const demandingSectors: Sector[] = [];
  for (const [sector, requiredResource] of Object.entries(SECTOR_RESOURCES)) {
    if (requiredResource === resource) {
      demandingSectors.push(sector as Sector);
    }
  }
  
  return {
    resource,
    basePrice,
    currentPrice,
    priceChange,
    totalSupply,
    scarcityFactor,
    topProducers,
    demandingSectors,
  };
}

/**
 * Get all commodity prices
 */
export function getAllCommodityPrices(): CommodityPrice[] {
  return RESOURCES.map(resource => calculateCommodityPrice(resource));
}

/**
 * Get resource breakdown for a specific state
 */
export function getStateResourceBreakdown(stateCode: string): {
  stateCode: string;
  stateName: string;
  resources: Array<{
    resource: Resource;
    amount: number;
    percentage: number;
    stateShareOfUS: number;
    currentPrice: number;
    totalValue: number;
  }>;
  totalResourceValue: number;
} {
  const stateResources = getStateResources(stateCode);
  const stateName = getStateLabel(stateCode) || stateCode;
  
  const resources: Array<{
    resource: Resource;
    amount: number;
    percentage: number;
    stateShareOfUS: number;
    currentPrice: number;
    totalValue: number;
  }> = [];
  
  let totalStateResources = 0;
  for (const amount of Object.values(stateResources)) {
    if (amount) totalStateResources += amount;
  }
  
  let totalResourceValue = 0;
  
  for (const resource of RESOURCES) {
    const amount = stateResources[resource] || 0;
    if (amount > 0) {
      const usTotal = getTotalResourcePool(resource);
      const commodityPrice = calculateCommodityPrice(resource);
      const totalValue = amount * commodityPrice.currentPrice;
      
      resources.push({
        resource,
        amount,
        percentage: totalStateResources > 0 ? (amount / totalStateResources) * 100 : 0,
        stateShareOfUS: usTotal > 0 ? (amount / usTotal) * 100 : 0,
        currentPrice: commodityPrice.currentPrice,
        totalValue,
      });
      
      totalResourceValue += totalValue;
    }
  }
  
  // Sort by percentage (largest first)
  resources.sort((a, b) => b.percentage - a.percentage);
  
  return {
    stateCode,
    stateName,
    resources,
    totalResourceValue,
  };
}

