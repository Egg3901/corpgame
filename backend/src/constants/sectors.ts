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
  'Mining',
] as const;

export type Sector = typeof SECTORS[number];

// ============================================================================
// CORPORATION FOCUS
// Determines what unit types a corporation can build
// ============================================================================

export const CORP_FOCUS_TYPES = [
  'extraction',    // Can only build extraction units
  'production',    // Can build production + extraction (if sector allows)
  'retail',        // Can only build retail units
  'service',       // Can only build service units
  'diversified',   // Can build all unit types
] as const;

export type CorpFocus = typeof CORP_FOCUS_TYPES[number];

// Validate if a string is a valid corporation focus
export function isValidCorpFocus(value: string): value is CorpFocus {
  return CORP_FOCUS_TYPES.includes(value as CorpFocus);
}

// Get display label for corporation focus
export function getCorpFocusLabel(focus: CorpFocus): string {
  const labels: Record<CorpFocus, string> = {
    'extraction': 'Extraction',
    'production': 'Production',
    'retail': 'Retail',
    'service': 'Service',
    'diversified': 'Diversified',
  };
  return labels[focus];
}

// Get description for corporation focus
export function getCorpFocusDescription(focus: CorpFocus): string {
  const descriptions: Record<CorpFocus, string> = {
    'extraction': 'Specializes in resource extraction. Can only build extraction units.',
    'production': 'Focuses on manufacturing. Can build production and extraction units (if sector allows).',
    'retail': 'Consumer-facing operations. Can only build retail units.',
    'service': 'Service-based business. Can only build service units.',
    'diversified': 'Full operational flexibility. Can build all unit types.',
  };
  return descriptions[focus];
}

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
  'Construction': null,  // Special case: consumes both Lumber and Steel via custom logic
  'Pharmaceuticals': 'Chemical Compounds',
  'Mining': null,  // Mining extracts resources, doesn't consume them for production
};

// ============================================================================
// EXTRACTION PERMISSIONS
// Which sectors can build extraction units and what resources they can extract
// ============================================================================

// Mapping of sectors to resources they can extract (null = cannot extract)
export const SECTOR_EXTRACTION: Record<Sector, Resource[] | null> = {
  'Technology': null,           // Cannot extract
  'Finance': null,              // Cannot extract
  'Healthcare': null,           // Cannot extract
  'Manufacturing': ['Steel'],   // Only production and service, now extracts Steel
  'Energy': ['Oil'],            // Oil extraction
  'Retail': null,               // Cannot extract
  'Real Estate': null,          // Cannot extract
  'Transportation': null,       // Cannot extract
  'Media': null,                // Cannot extract
  'Telecommunications': null,   // Cannot extract
  'Agriculture': ['Fertile Land', 'Lumber'],  // Farming and forestry
  'Defense': null,              // Cannot extract
  'Hospitality': null,          // Cannot extract
  'Construction': ['Lumber'],   // Can harvest lumber
  'Pharmaceuticals': ['Chemical Compounds'],  // Chemical extraction/synthesis
  'Mining': ['Steel', 'Copper', 'Rare Earth'],  // Primary extraction sector
};

// Check if a sector can build extraction units
export function sectorCanExtract(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const extractable = SECTOR_EXTRACTION[sector];
  return extractable !== null && extractable.length > 0;
}

// Get extractable resources for a sector
export function getSectorExtractableResources(sector: string): Resource[] {
  if (!isValidSector(sector)) return [];
  return SECTOR_EXTRACTION[sector] || [];
}

// Check if a sector can extract a specific resource
export function sectorCanExtractResource(sector: string, resource: Resource): boolean {
  if (!isValidSector(sector)) return false;
  const extractable = SECTOR_EXTRACTION[sector];
  return extractable !== null && extractable.includes(resource);
}

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

// Cache for resource pool totals (computed once since state resources are static)
const _resourcePoolCache: Map<Resource, number> = new Map();

// Get total US pool for a resource (cached)
export function getTotalResourcePool(resource: Resource): number {
  const cached = _resourcePoolCache.get(resource);
  if (cached !== undefined) {
    return cached;
  }
  
  let total = 0;
  for (const stateCode of Object.keys(STATE_RESOURCES)) {
    total += STATE_RESOURCES[stateCode]?.[resource] || 0;
  }
  
  _resourcePoolCache.set(resource, total);
  return total;
}

// Cache for states with resources (computed once)
const _statesWithResourceCache: Map<Resource, Array<{ stateCode: string; amount: number }>> = new Map();

// Get all states that have a specific resource, sorted by amount (descending) - cached
export function getStatesWithResource(resource: Resource): Array<{ stateCode: string; amount: number }> {
  const cached = _statesWithResourceCache.get(resource);
  if (cached) {
    return cached;
  }

  const states: Array<{ stateCode: string; amount: number }> = [];
  
  for (const [stateCode, resources] of Object.entries(STATE_RESOURCES)) {
    const amount = resources[resource];
    if (amount && amount > 0) {
      states.push({ stateCode, amount });
    }
  }
  
  const result = states.sort((a, b) => b.amount - a.amount);
  _statesWithResourceCache.set(resource, result);
  return result;
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
  'Northeast': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  'Midwest': ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South': ['DE', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX'],
  'West': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
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
// STATE CAPACITY SYSTEM
// State multiplier now affects unit CAPACITY, not revenue
// ============================================================================

// Base number of units allowed per sector per state
export const BASE_SECTOR_CAPACITY = 15;

// Get the maximum number of units allowed for a sector in a state
export function getStateSectorCapacity(stateCode: string): number {
  const multiplier = getStateMultiplier(stateCode);
  return Math.floor(BASE_SECTOR_CAPACITY * multiplier);
}

// Check if more units can be built in a state/sector
export function canBuildMoreUnits(
  stateCode: string,
  currentUnitCount: number
): { allowed: boolean; capacity: number; remaining: number } {
  const capacity = getStateSectorCapacity(stateCode);
  const remaining = capacity - currentUnitCount;
  return {
    allowed: remaining > 0,
    capacity,
    remaining: Math.max(0, remaining),
  };
}

// Capacity tier types
export type CapacityTier = 'High' | 'Medium' | 'Low';

// Get capacity tier for a state based on multiplier
export function getStateCapacityTier(stateCode: string): CapacityTier {
  const multiplier = getStateMultiplier(stateCode);
  if (multiplier >= 4.0) return 'High';
  if (multiplier >= 2.0) return 'Medium';
  return 'Low';
}

// Get capacity info for a state (used by API endpoints)
export function getStateCapacityInfo(stateCode: string, currentUnitCount: number = 0): {
  capacity: number;
  used: number;
  remaining: number;
  tier: CapacityTier;
  multiplier: number;
  isAtCapacity: boolean;
  isOverCapacity: boolean;
} {
  const capacity = getStateSectorCapacity(stateCode);
  const multiplier = getStateMultiplier(stateCode);
  const tier = getStateCapacityTier(stateCode);
  const remaining = Math.max(0, capacity - currentUnitCount);

  return {
    capacity,
    used: currentUnitCount,
    remaining,
    tier,
    multiplier,
    isAtCapacity: currentUnitCount >= capacity,
    isOverCapacity: currentUnitCount > capacity,
  };
}

// ============================================================================
// BUSINESS UNIT ECONOMICS
// ============================================================================

// Business unit types
export const UNIT_TYPES = ['retail', 'production', 'service', 'extraction'] as const;
export type UnitType = typeof UNIT_TYPES[number];

// Base unit economics - hourly rates (used for sectors WITHOUT resource/product dynamics)
// For production sectors with inputs/outputs, use getDynamicUnitEconomics() instead
export const UNIT_ECONOMICS: Record<UnitType, { baseRevenue: number; baseCost: number }> = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },  // Overridden for resource-dependent sectors
  service: { baseRevenue: 400, baseCost: 200 },
  extraction: { baseRevenue: 1000, baseCost: 700 },  // Revenue tied to commodity prices
};

// Labor cost component (doesn't vary with commodity prices)
export const UNIT_LABOR_COSTS: Record<UnitType, number> = {
  retail: 250,
  production: 400,
  service: 150,
  extraction: 500,
};

// Resource consumption rate per production unit per hour
export const PRODUCTION_RESOURCE_CONSUMPTION = 0.5;  // Units of resource consumed per hour

export const PRODUCTION_PRODUCT_CONSUMPTION = 0.5;

// Product output rate per production unit per hour  
export const PRODUCTION_OUTPUT_RATE = 1.0;  // Units of product produced per hour

// Extraction output rate per extraction unit per hour
export const EXTRACTION_OUTPUT_RATE = 2.0;  // Units of resource extracted per hour

// Product consumption rate per retail unit per hour
export const RETAIL_PRODUCT_CONSUMPTION = 2.0;  // Units of product consumed per hour

// Product consumption rate per service unit per hour
export const SERVICE_PRODUCT_CONSUMPTION = 1.5;  // Units of product consumed per hour

export const SERVICE_ELECTRICITY_CONSUMPTION = 0.5;
export const PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5;
export const EXTRACTION_ELECTRICITY_CONSUMPTION = 0.25;

// Construction sector special input requirements
// Construction production units consume multiple resources and products
export const CONSTRUCTION_LUMBER_CONSUMPTION = 0.5;  // Units per hour
export const CONSTRUCTION_STEEL_CONSUMPTION = 0.5;   // Units per hour
export const CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION = 0.3;  // Units per hour

// ============================================================================
// ADDITIONAL SECTOR INPUT REQUIREMENTS
// Various sectors require additional products beyond their primary inputs
// ============================================================================

// Production unit additional demands (products consumed during production)
export const ENERGY_LOGISTICS_CONSUMPTION = 0.3;          // Fuel delivery, equipment transport
export const MANUFACTURING_LOGISTICS_CONSUMPTION = 0.4;   // Raw material delivery, finished goods shipping
export const AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION = 0.3;  // Tractors, harvesters, irrigation equipment
export const PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION = 0.25;     // Lab equipment, R&D systems
export const DEFENSE_TECHNOLOGY_CONSUMPTION = 0.4;        // Electronics, guidance systems, comms

// Extraction unit additional demands
export const MINING_MANUFACTURED_GOODS_CONSUMPTION = 0.35;  // Drills, conveyors, trucks, equipment

// Service unit additional demands
export const HEALTHCARE_TECHNOLOGY_CONSUMPTION = 0.4;     // Medical devices, diagnostic equipment
export const RETAIL_LOGISTICS_CONSUMPTION = 0.3;          // Supply chain, deliveries
export const REAL_ESTATE_LOGISTICS_CONSUMPTION = 0.25;    // Moving services, maintenance logistics

export const RETAIL_WHOLESALE_DISCOUNT = 0.995;
export const SERVICE_WHOLESALE_DISCOUNT = 0.995;
export const DEFENSE_WHOLESALE_DISCOUNT = 0.8;
export const DEFENSE_REVENUE_ON_COST_MULTIPLIER = 1.0;
export const RETAIL_MIN_GROSS_MARGIN_PCT = 0.0005;
export const SERVICE_MIN_GROSS_MARGIN_PCT = 0.0005;

// ============================================================================
// UNIT TYPE PERMISSIONS BY FOCUS
// What unit types each corporation focus can build
// ============================================================================

export const FOCUS_ALLOWED_UNITS: Record<CorpFocus, UnitType[]> = {
  'extraction': ['extraction'],
  'production': ['production', 'extraction'],  // Production focus can also extract (if sector allows)
  'retail': ['retail'],
  'service': ['service'],
  'diversified': ['retail', 'production', 'service', 'extraction'],
};

// Check if a corporation with given focus can build a unit type
export function focusCanBuildUnit(focus: CorpFocus, unitType: UnitType): boolean {
  return FOCUS_ALLOWED_UNITS[focus].includes(unitType);
}

// Check if a corporation can build a specific unit type (considering focus AND sector)
export function canBuildUnit(
  sector: string,
  focus: CorpFocus,
  unitType: UnitType
): { allowed: boolean; reason?: string } {
  // First check if focus allows this unit type
  if (!focusCanBuildUnit(focus, unitType)) {
    return {
      allowed: false,
      reason: `${getCorpFocusLabel(focus)} corporations cannot build ${unitType} units`,
    };
  }

  // For extraction, also check if sector allows it
  if (unitType === 'extraction') {
    if (!isValidSector(sector)) {
      return { allowed: false, reason: 'Invalid sector' };
    }
    if (!sectorCanExtract(sector)) {
      return {
        allowed: false,
        reason: `${sector} sector cannot build extraction units`,
      };
    }
  }

  // For production, check if sector allows production units
  if (unitType === 'production') {
    if (!isValidSector(sector)) {
      return { allowed: false, reason: 'Invalid sector' };
    }
    if (!sectorCanBuildProduction(sector)) {
      return {
        allowed: false,
        reason: `${sector} sector cannot build production units`,
      };
    }
  }

  // For retail, check if sector allows retail units
  if (unitType === 'retail') {
    if (!isValidSector(sector)) {
      return { allowed: false, reason: 'Invalid sector' };
    }
    if (!sectorCanBuildRetail(sector)) {
      return {
        allowed: false,
        reason: `${sector} sector cannot build retail units`,
      };
    }
  }

  // For service, check if sector allows service units
  if (unitType === 'service') {
    if (!isValidSector(sector)) {
      return { allowed: false, reason: 'Invalid sector' };
    }
    if (!sectorCanBuildService(sector)) {
      return {
        allowed: false,
        reason: `${sector} sector cannot build service units`,
      };
    }
  }

  return { allowed: true };
}

// Display period multiplier (96 hours = 4 days)
export const DISPLAY_PERIOD_HOURS = 96;

// Market entry cost
export const MARKET_ENTRY_COST = 50000;
export const MARKET_ENTRY_ACTIONS = 1;

// Build unit cost
export const BUILD_UNIT_COST = 10000;
export const BUILD_UNIT_ACTIONS = 1;

// ============================================================================
// DYNAMIC UNIT ECONOMICS
// Calculates real costs/revenue based on commodity and product prices
// ============================================================================

export interface DynamicUnitEconomics {
  hourlyRevenue: number;
  hourlyCost: number;
  hourlyProfit: number;
  laborCost: number;
  resourceCost: number;          // Cost of input resources (for production)
  resourceConsumed: Resource | null;  // Deprecated: use resourcesConsumed instead
  resourceConsumedAmount: number;     // Deprecated: use resourceConsumedAmounts instead
  resourcesConsumed: Resource[];      // Resources consumed (for production units with multiple inputs)
  resourceConsumedAmounts: Record<Resource, number>;  // Amount of each resource consumed
  productRevenue: number;        // Revenue from output products
  productProduced: Product | null;
  productProducedAmount: number;
  productCost: number;           // Cost of input products (for retail/service)
  productsConsumed: Product[];   // Products consumed (for retail/service)
  productConsumedAmounts: Record<Product, number>;  // Amount of each product consumed
  isDynamic: boolean;            // True if this uses commodity-based pricing
}

// Cache for dynamic unit economics (key = "unitType:sector")
const _dynamicEconomicsCache: Map<string, DynamicUnitEconomics> = new Map();

export interface MarketPriceOverrides {
  commodityPrices?: Partial<Record<Resource, number>>;
  productPrices?: Partial<Record<Product, number>>;
}

/**
 * Get dynamic economics for a unit type in a specific sector (cached)
 * - Retail/Service: Dynamic costs based on product demands
 * - Production: Cost = labor + (resource input * commodity price), Revenue = product output * product price
 * - Extraction: Revenue = extraction output * commodity price, Cost = labor only
 */
export function getDynamicUnitEconomics(
  unitType: UnitType,
  sector: string,
  marketPrices?: MarketPriceOverrides
): DynamicUnitEconomics {
  const canUseCache = !marketPrices?.commodityPrices && !marketPrices?.productPrices;
  const cacheKey = `${unitType}:${sector}`;
  if (canUseCache) {
    const cached = _dynamicEconomicsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }
  const laborCost = UNIT_LABOR_COSTS[unitType];
  
  // Default non-dynamic economics
  const baseEcon = UNIT_ECONOMICS[unitType];
  const defaultResult: DynamicUnitEconomics = {
    hourlyRevenue: baseEcon.baseRevenue,
    hourlyCost: baseEcon.baseCost,
    hourlyProfit: baseEcon.baseRevenue - baseEcon.baseCost,
    laborCost,
    resourceCost: 0,
    resourceConsumed: null,
    resourceConsumedAmount: 0,
    resourcesConsumed: [],
    resourceConsumedAmounts: {} as Record<Resource, number>,
    productRevenue: 0,
    productProduced: null,
    productProducedAmount: 0,
    productCost: 0,
    productsConsumed: [],
    productConsumedAmounts: {} as Record<Product, number>,
    isDynamic: false,
  };

  if (!isValidSector(sector)) {
    if (canUseCache) {
      _dynamicEconomicsCache.set(cacheKey, defaultResult);
    }
    return defaultResult;
  }

  const sectorTyped = sector as Sector;
  const requiredResource = SECTOR_RESOURCES[sectorTyped];
  const producedProduct = SECTOR_PRODUCTS[sectorTyped];

  const getCommodityUnitPrice = (resource: Resource): number => {
    return marketPrices?.commodityPrices?.[resource] ?? calculateCommodityPrice(resource).currentPrice;
  };

  const getProductUnitPrice = (product: Product): number => {
    return marketPrices?.productPrices?.[product] ?? getBaseProductPrice(product);
  };

  // Retail units: dynamic costs based on product demands
  if (unitType === 'retail') {
    const retailDemands = SECTOR_RETAIL_DEMANDS[sectorTyped];
    
    // If sector cannot build retail units, return default with zero profitability
    if (!retailDemands || retailDemands.length === 0) {
      const errorResult = { ...defaultResult, hourlyCost: 999999, hourlyProfit: -999999 };
      if (canUseCache) {
        _dynamicEconomicsCache.set(cacheKey, errorResult);
      }
      return errorResult;
    }

    // Calculate product costs and revenue
    let totalProductCost = 0;
    let revenueRaw = 0;
    const productConsumedAmounts: Record<Product, number> = {} as Record<Product, number>;
    
    for (const product of retailDemands) {
      const productPrice = getProductUnitPrice(product);
      const consumedAmount = sectorTyped === 'Defense' ? 1.0 : RETAIL_PRODUCT_CONSUMPTION;
      const discount = sectorTyped === 'Defense' ? DEFENSE_WHOLESALE_DISCOUNT : RETAIL_WHOLESALE_DISCOUNT;
      
      const productCost = productPrice * consumedAmount * discount;
      totalProductCost += productCost;
      
      if (sectorTyped === 'Defense') {
        revenueRaw += productCost * DEFENSE_REVENUE_ON_COST_MULTIPLIER;
      } else {
        revenueRaw += productPrice * consumedAmount;
      }
      
      productConsumedAmounts[product] = consumedAmount;
    }

    const totalCost = laborCost + totalProductCost;
    const minRevenue = totalCost * (1 + RETAIL_MIN_GROSS_MARGIN_PCT);
    const revenue = Math.max(revenueRaw, minRevenue);
    const hourlyProfit = revenue - totalCost;

    const result: DynamicUnitEconomics = {
      hourlyRevenue: revenue,
      hourlyCost: totalCost,
      hourlyProfit,
      laborCost,
      resourceCost: 0,
      resourceConsumed: null,
      resourceConsumedAmount: 0,
      resourcesConsumed: [],
      resourceConsumedAmounts: {} as Record<Resource, number>,
      productRevenue: revenue,
      productProduced: null,
      productProducedAmount: 0,
      productCost: totalProductCost,
      productsConsumed: retailDemands,
      productConsumedAmounts,
      isDynamic: true,
    };
    if (canUseCache) {
      _dynamicEconomicsCache.set(cacheKey, result);
    }
    return result;
  }

  // Service units: dynamic costs based on product demands
  if (unitType === 'service') {
    const serviceDemands = SECTOR_SERVICE_DEMANDS[sectorTyped];
    
    // If sector cannot build service units, return default with zero profitability
    if (!serviceDemands || serviceDemands.length === 0) {
      const errorResult = { ...defaultResult, hourlyCost: 999999, hourlyProfit: -999999 };
      if (canUseCache) {
        _dynamicEconomicsCache.set(cacheKey, errorResult);
      }
      return errorResult;
    }

    // Calculate product costs and revenue
    let totalProductCost = 0;
    let revenueRaw = 0;
    const productConsumedAmounts: Record<Product, number> = {} as Record<Product, number>;
    
    // Track products consumed for the result (will be augmented with additional demands)
    const productsConsumedSet = new Set<Product>(serviceDemands);

    for (const product of serviceDemands) {
      const productPrice = getProductUnitPrice(product);
      let consumedAmount = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;

      // Defense sector rule: 1.0 consumption for products (excluding electricity)
      if (sectorTyped === 'Defense' && product !== 'Electricity') {
        consumedAmount = 1.0;
      } else if (sectorTyped === 'Manufacturing' && product !== 'Electricity') {
        consumedAmount = 0.5; // Manufacturing service demands less
      }

      let discount = product === 'Electricity' ? 1 : SERVICE_WHOLESALE_DISCOUNT;
      if (sectorTyped === 'Defense' && product !== 'Electricity') {
        discount = DEFENSE_WHOLESALE_DISCOUNT;
      }

      const productCost = productPrice * consumedAmount * discount;
      totalProductCost += productCost;

      if (sectorTyped === 'Defense' && product !== 'Electricity') {
        revenueRaw += productCost * DEFENSE_REVENUE_ON_COST_MULTIPLIER;
      } else {
        revenueRaw += productPrice * consumedAmount;
      }

      productConsumedAmounts[product] = consumedAmount;
    }

    // Additional service unit demands for specific sectors
    // Healthcare services require Technology Products (medical devices, diagnostics)
    if (sectorTyped === 'Healthcare') {
      const techAmount = HEALTHCARE_TECHNOLOGY_CONSUMPTION;
      const techPrice = getProductUnitPrice('Technology Products');
      const techCost = techPrice * techAmount * SERVICE_WHOLESALE_DISCOUNT;
      totalProductCost += techCost;
      revenueRaw += techPrice * techAmount;
      productsConsumedSet.add('Technology Products');
      productConsumedAmounts['Technology Products'] = techAmount;
    }

    // Retail services require Logistics Capacity (supply chain, deliveries)
    if (sectorTyped === 'Retail') {
      const logisticsAmount = RETAIL_LOGISTICS_CONSUMPTION;
      const logisticsPrice = getProductUnitPrice('Logistics Capacity');
      const logisticsCost = logisticsPrice * logisticsAmount * SERVICE_WHOLESALE_DISCOUNT;
      totalProductCost += logisticsCost;
      revenueRaw += logisticsPrice * logisticsAmount;
      productsConsumedSet.add('Logistics Capacity');
      productConsumedAmounts['Logistics Capacity'] = logisticsAmount;
    }

    // Real Estate services require Logistics Capacity (moving, maintenance)
    if (sectorTyped === 'Real Estate') {
      const logisticsAmount = REAL_ESTATE_LOGISTICS_CONSUMPTION;
      const logisticsPrice = getProductUnitPrice('Logistics Capacity');
      const logisticsCost = logisticsPrice * logisticsAmount * SERVICE_WHOLESALE_DISCOUNT;
      totalProductCost += logisticsCost;
      revenueRaw += logisticsPrice * logisticsAmount;
      productsConsumedSet.add('Logistics Capacity');
      productConsumedAmounts['Logistics Capacity'] = logisticsAmount;
    }

    const minRevenue = totalProductCost * (1 + SERVICE_MIN_GROSS_MARGIN_PCT);
    const revenue = Math.max(revenueRaw, minRevenue);
    const totalCost = laborCost + totalProductCost;
    const hourlyProfit = revenue - totalCost;

    const result: DynamicUnitEconomics = {
      hourlyRevenue: revenue,
      hourlyCost: totalCost,
      hourlyProfit,
      laborCost,
      resourceCost: 0,
      resourceConsumed: null,
      resourceConsumedAmount: 0,
      resourcesConsumed: [],
      resourceConsumedAmounts: {} as Record<Resource, number>,
      productRevenue: revenue,
      productProduced: null,
      productProducedAmount: 0,
      productCost: totalProductCost,
      productsConsumed: Array.from(productsConsumedSet),
      productConsumedAmounts,
      isDynamic: true,
    };
    if (canUseCache) {
      _dynamicEconomicsCache.set(cacheKey, result);
    }
    return result;
  }

  // Extraction units: revenue from extracted commodity
  if (unitType === 'extraction') {
    const extractableResources = SECTOR_EXTRACTION[sectorTyped];
    if (!extractableResources || extractableResources.length === 0) {
      if (canUseCache) {
        _dynamicEconomicsCache.set(cacheKey, defaultResult);
      }
      return defaultResult;
    }

    // Use first extractable resource for pricing
    const extractedResource = extractableResources[0] as Resource;
    const commodityUnitPrice = getCommodityUnitPrice(extractedResource);
    const extractionAmount = EXTRACTION_OUTPUT_RATE;
    const extractionRevenue = extractionAmount * commodityUnitPrice;

    const electricityConsumedAmount = EXTRACTION_ELECTRICITY_CONSUMPTION;
    const electricityCost = electricityConsumedAmount * getProductUnitPrice('Electricity');
    const productConsumedAmounts: Record<Product, number> = {} as Record<Product, number>;
    const productsConsumed: Product[] = [];
    let additionalProductCost = 0;

    if (electricityConsumedAmount > 0) {
      productsConsumed.push('Electricity');
      productConsumedAmounts['Electricity'] = electricityConsumedAmount;
    }

    // Mining extraction units require Manufactured Goods (equipment, drills, trucks)
    if (sectorTyped === 'Mining') {
      const manufacturedGoodsAmount = MINING_MANUFACTURED_GOODS_CONSUMPTION;
      additionalProductCost += manufacturedGoodsAmount * getProductUnitPrice('Manufactured Goods');
      productsConsumed.push('Manufactured Goods');
      productConsumedAmounts['Manufactured Goods'] = manufacturedGoodsAmount;
    }

    const totalProductCost = electricityCost + additionalProductCost;
    const totalCost = laborCost + totalProductCost;

    const result: DynamicUnitEconomics = {
      hourlyRevenue: extractionRevenue,
      hourlyCost: totalCost,
      hourlyProfit: extractionRevenue - totalCost,
      laborCost,
      resourceCost: 0,
      resourceConsumed: null,
      resourceConsumedAmount: 0,
      resourcesConsumed: [],
      resourceConsumedAmounts: {} as Record<Resource, number>,
      productRevenue: extractionRevenue,
      productProduced: null,  // Produces a resource, not a product
      productProducedAmount: extractionAmount,
      productCost: totalProductCost,
      productsConsumed,
      productConsumedAmounts,
      isDynamic: true,
    };
    if (canUseCache) {
      _dynamicEconomicsCache.set(cacheKey, result);
    }
    return result;
  }

  // Production units: dynamic costs and revenue
  if (unitType === 'production') {
    let resourceCost = 0;
    let resourceConsumedAmount = 0;
    let resourceConsumed: Resource | null = null;
    const resourcesConsumed: Resource[] = [];
    const resourceConsumedAmounts: Record<Resource, number> = {} as Record<Resource, number>;

    // Construction sector consumes both Lumber and Steel
    if (sectorTyped === 'Construction') {
      // Lumber consumption
      const lumberAmount = CONSTRUCTION_LUMBER_CONSUMPTION;
      const lumberCost = lumberAmount * getCommodityUnitPrice('Lumber');
      resourcesConsumed.push('Lumber');
      resourceConsumedAmounts['Lumber'] = lumberAmount;
      resourceCost += lumberCost;

      // Steel consumption
      const steelAmount = CONSTRUCTION_STEEL_CONSUMPTION;
      const steelCost = steelAmount * getCommodityUnitPrice('Steel');
      resourcesConsumed.push('Steel');
      resourceConsumedAmounts['Steel'] = steelAmount;
      resourceCost += steelCost;

      // Set deprecated fields for backward compatibility (use first resource)
      resourceConsumed = 'Lumber';
      resourceConsumedAmount = lumberAmount + steelAmount;
    } else if (requiredResource) {
      // Standard single resource consumption for other sectors
      resourceConsumedAmount = PRODUCTION_RESOURCE_CONSUMPTION;
      resourceCost = resourceConsumedAmount * getCommodityUnitPrice(requiredResource);
      resourceConsumed = requiredResource;
      resourcesConsumed.push(requiredResource);
      resourceConsumedAmounts[requiredResource] = resourceConsumedAmount;
    }

    let productRevenue = 0;
    let productProducedAmount = 0;
    let productProduced: Product | null = null;

    // Calculate output revenue from produced product
    if (producedProduct) {
      productProducedAmount = PRODUCTION_OUTPUT_RATE;
      productRevenue = productProducedAmount * getProductUnitPrice(producedProduct);
      productProduced = producedProduct;
    } else {
      // No product output - use base revenue
      productRevenue = baseEcon.baseRevenue;
    }

    const electricityConsumedAmount = PRODUCTION_ELECTRICITY_CONSUMPTION;
    const electricityCost = electricityConsumedAmount * getProductUnitPrice('Electricity');
    const productConsumedAmounts: Record<Product, number> = {} as Record<Product, number>;
    const productsConsumed: Product[] = [];
    if (electricityConsumedAmount > 0) {
      productsConsumed.push('Electricity');
      productConsumedAmounts['Electricity'] = electricityConsumedAmount;
    }

    // Additional product consumption for specific sectors
    let additionalProductCost = 0;

    // Construction sector consumes Manufactured Goods
    if (sectorTyped === 'Construction') {
      const manufacturedGoodsAmount = CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION;
      additionalProductCost += manufacturedGoodsAmount * getProductUnitPrice('Manufactured Goods');
      productsConsumed.push('Manufactured Goods');
      productConsumedAmounts['Manufactured Goods'] = manufacturedGoodsAmount;
    }

    // Energy production requires Logistics Capacity (fuel delivery, equipment transport)
    if (sectorTyped === 'Energy') {
      const logisticsAmount = ENERGY_LOGISTICS_CONSUMPTION;
      additionalProductCost += logisticsAmount * getProductUnitPrice('Logistics Capacity');
      productsConsumed.push('Logistics Capacity');
      productConsumedAmounts['Logistics Capacity'] = logisticsAmount;
    }

    // Manufacturing production requires Logistics Capacity (raw materials in, finished goods out)
    if (sectorTyped === 'Manufacturing') {
      const logisticsAmount = MANUFACTURING_LOGISTICS_CONSUMPTION;
      additionalProductCost += logisticsAmount * getProductUnitPrice('Logistics Capacity');
      productsConsumed.push('Logistics Capacity');
      productConsumedAmounts['Logistics Capacity'] = logisticsAmount;
    }

    // Agriculture production requires Manufactured Goods (tractors, harvesters, equipment)
    if (sectorTyped === 'Agriculture') {
      const manufacturedGoodsAmount = AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION;
      additionalProductCost += manufacturedGoodsAmount * getProductUnitPrice('Manufactured Goods');
      productsConsumed.push('Manufactured Goods');
      productConsumedAmounts['Manufactured Goods'] = manufacturedGoodsAmount;
    }

    // Pharmaceuticals production requires Technology Products (lab equipment, R&D systems)
    if (sectorTyped === 'Pharmaceuticals') {
      const techAmount = PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION;
      additionalProductCost += techAmount * getProductUnitPrice('Technology Products');
      productsConsumed.push('Technology Products');
      productConsumedAmounts['Technology Products'] = techAmount;
    }

    // Defense production requires Technology Products (electronics, guidance, comms)
    if (sectorTyped === 'Defense') {
      const techAmount = DEFENSE_TECHNOLOGY_CONSUMPTION;
      additionalProductCost += techAmount * getProductUnitPrice('Technology Products');
      productsConsumed.push('Technology Products');
      productConsumedAmounts['Technology Products'] = techAmount;
    }

    const productCost = electricityCost + additionalProductCost;
    const totalCost = laborCost + resourceCost + productCost;
    const hourlyProfit = productRevenue - totalCost;

    const result: DynamicUnitEconomics = {
      hourlyRevenue: productRevenue,
      hourlyCost: totalCost,
      hourlyProfit,
      laborCost,
      resourceCost,
      resourceConsumed,
      resourceConsumedAmount,
      resourcesConsumed,
      resourceConsumedAmounts,
      productRevenue,
      productProduced,
      productProducedAmount,
      productCost,
      productsConsumed,
      productConsumedAmounts,
      isDynamic: requiredResource !== null || producedProduct !== null || electricityConsumedAmount > 0 || sectorTyped === 'Construction',
    };
    if (canUseCache) {
      _dynamicEconomicsCache.set(cacheKey, result);
    }
    return result;
  }

  if (canUseCache) {
    _dynamicEconomicsCache.set(cacheKey, defaultResult);
  }
  return defaultResult;
}

/**
 * Calculate total economics for a market entry with multiple units
 */
export function calculateMarketEntryEconomics(
  sector: string,
  stateCode: string,
  retailCount: number,
  productionCount: number,
  serviceCount: number,
  extractionCount: number,
  marketPrices?: MarketPriceOverrides
): {
  hourlyRevenue: number;
  hourlyCost: number;
  hourlyProfit: number;
  breakdown: {
    retail: DynamicUnitEconomics;
    production: DynamicUnitEconomics;
    service: DynamicUnitEconomics;
    extraction: DynamicUnitEconomics;
  };
} {
  const retailEcon = getDynamicUnitEconomics('retail', sector, marketPrices);
  const productionEcon = getDynamicUnitEconomics('production', sector, marketPrices);
  const serviceEcon = getDynamicUnitEconomics('service', sector, marketPrices);
  const extractionEcon = getDynamicUnitEconomics('extraction', sector, marketPrices);

  const hourlyRevenue = 
    retailEcon.hourlyRevenue * retailCount +
    productionEcon.hourlyRevenue * productionCount +
    serviceEcon.hourlyRevenue * serviceCount +
    extractionEcon.hourlyRevenue * extractionCount;

  const hourlyCost =
    retailEcon.hourlyCost * retailCount +
    productionEcon.hourlyCost * productionCount +
    serviceEcon.hourlyCost * serviceCount +
    extractionEcon.hourlyCost * extractionCount;

  return {
    hourlyRevenue,
    hourlyCost,
    hourlyProfit: hourlyRevenue - hourlyCost,
    breakdown: {
      retail: retailEcon,
      production: productionEcon,
      service: serviceEcon,
      extraction: extractionEcon,
    },
  };
}

// ============================================================================
// STOCK VALUATION
// ============================================================================

export const STOCK_VALUATION = {
  // Minimum share price floor
  MIN_SHARE_PRICE: 0.01,
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

  // NPV-based unit valuation constants
  // Initial basis cost for each business unit (what you paid to build it)
  UNIT_BASIS_COST: 10000,  // $10k per unit
  // Discount rate for NPV calculation (20% = aggressive/risky business)
  NPV_DISCOUNT_RATE: 0.20,
};

// Calculate asset value per unit using NPV-based valuation
// Formula: Unit Value = Basis Cost ($10k) + NPV of future earnings
// NPV = Annual Profit / Discount Rate (perpetuity formula)
// For negative earnings, NPV reduces value but never below $0
export function getUnitAssetValue(unitType: UnitType, sector?: string): number {
  const basisCost = STOCK_VALUATION.UNIT_BASIS_COST;
  const discountRate = STOCK_VALUATION.NPV_DISCOUNT_RATE;

  let hourlyProfit: number;

  // If sector provided, use dynamic economics
  if (sector && isValidSector(sector)) {
    const dynamicEcon = getDynamicUnitEconomics(unitType, sector);
    hourlyProfit = dynamicEcon.hourlyProfit;
  } else {
    // Fallback to flat economics
    const economics = UNIT_ECONOMICS[unitType];
    hourlyProfit = economics.baseRevenue - economics.baseCost;
  }

  const annualProfit = hourlyProfit * STOCK_VALUATION.HOURS_PER_YEAR;

  // NPV of perpetuity = Annual Profit / Discount Rate
  // For positive profits: adds value above basis
  // For negative profits: reduces value (can go below basis but not below 0)
  const npv = annualProfit / discountRate;

  // Unit value = basis + NPV, minimum $0
  return Math.max(0, basisCost + npv);
}

// Get dynamic asset value for a market entry
export function getMarketEntryAssetValue(
  sector: string,
  stateCode: string,
  retailCount: number,
  productionCount: number,
  serviceCount: number,
  extractionCount: number
): {
  totalValue: number;
  retailValue: number;
  productionValue: number;
  serviceValue: number;
  extractionValue: number;
} {
  const retailAsset = getUnitAssetValue('retail', sector);
  const productionAsset = getUnitAssetValue('production', sector);
  const serviceAsset = getUnitAssetValue('service', sector);
  const extractionAsset = getUnitAssetValue('extraction', sector);

  const retailValue = retailAsset * retailCount;
  const productionValue = productionAsset * productionCount;
  const serviceValue = serviceAsset * serviceCount;
  const extractionValue = extractionAsset * extractionCount;

  return {
    totalValue: retailValue + productionValue + serviceValue + extractionValue,
    retailValue,
    productionValue,
    serviceValue,
    extractionValue,
  };
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
  'Rare Earth': 9000,           // Adjusted base price
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

// Cache for commodity prices (prices are dynamic based on actual extraction, so cache with short TTL)
const _commodityPriceCache: Map<string, { price: CommodityPrice; timestamp: number }> = new Map();
const COMMODITY_CACHE_TTL = 60000; // 1 minute cache

/**
 * Calculate commodity price based on actual supply and demand
 * Supply = total extraction units producing this resource * extraction rate
 * Demand = total production units consuming this resource * consumption rate
 * Price = BasePrice * (Demand / Supply) with bounds
 * 
 * When demand exceeds supply, price goes up
 * When supply exceeds demand, price goes down
 * 
 * @param resource - The resource type
 * @param actualSupply - Total extraction output (extraction units * rate)
 * @param actualDemand - Total production consumption (production units * rate)
 */
export function calculateCommodityPrice(
  resource: Resource,
  actualSupply?: number,
  actualDemand?: number
): CommodityPrice {
  // For backward compatibility, if supply/demand not provided, use static calculation
  if (actualSupply === undefined || actualDemand === undefined) {
    return calculateStaticCommodityPrice(resource);
  }

  // Check cache
  const cacheKey = `${resource}:${actualSupply}:${actualDemand}`;
  const cached = _commodityPriceCache.get(cacheKey);
  const now = Date.now();
  if (cached && (now - cached.timestamp) < COMMODITY_CACHE_TTL) {
    return cached.price;
  }

  const basePrice = RESOURCE_BASE_PRICES[resource];
  
  // Calculate supply/demand ratio without floors
  let scarcityFactor = 1.0;
  if (actualSupply > 0 || actualDemand > 0) {
    // Truly unlimited scarcity: demand / supply (with small epsilon for zero supply)
    scarcityFactor = actualDemand / Math.max(0.01, actualSupply);
  } else {
    scarcityFactor = 1.0;
  }
  // No cap on scarcity factor
  
  // Calculate current price
  const rawPrice = Math.round(basePrice * scarcityFactor * 100) / 100;
  const currentPrice = Math.max(PRODUCT_MIN_PRICE, rawPrice); // Use same floor as products
  
  // Calculate price change percentage from base
  const priceChange = ((currentPrice - basePrice) / basePrice) * 100;
  
  // Get top states with this resource (for display)
  const topStates = getStatesWithResource(resource).slice(0, 5);
  const totalStaticPool = getTotalResourcePool(resource);
  const topProducers = topStates.map(s => ({
    stateCode: s.stateCode,
    stateName: getStateLabel(s.stateCode) || s.stateCode,
    amount: s.amount,
    percentage: totalStaticPool > 0 ? (s.amount / totalStaticPool) * 100 : 0,
  }));
  
  // Get sectors that demand this resource
  const demandingSectors: Sector[] = [];
  for (const [sector, requiredResource] of Object.entries(SECTOR_RESOURCES)) {
    if (requiredResource === resource) {
      demandingSectors.push(sector as Sector);
    }
  }
  
  const result: CommodityPrice = {
    resource,
    basePrice,
    currentPrice,
    priceChange,
    totalSupply: actualSupply, // Now represents actual extraction output
    scarcityFactor,
    topProducers,
    demandingSectors,
  };
  
  _commodityPriceCache.set(cacheKey, { price: result, timestamp: now });
  return result;
}

/**
 * Calculate static commodity price based on resource pools (legacy/fallback)
 * Used when actual extraction data is not available
 */
function calculateStaticCommodityPrice(resource: Resource): CommodityPrice {
  const basePrice = RESOURCE_BASE_PRICES[resource];
  const totalSupply = getTotalResourcePool(resource);
  const referencePool = REFERENCE_POOL_SIZES[resource];
  
  // Calculate scarcity factor without clamp
  const rawScarcity = totalSupply > 0 ? referencePool / totalSupply : 20.0;
  const scarcityFactor = rawScarcity;
  
  // Calculate current price
  const rawPrice = Math.round(basePrice * scarcityFactor * 100) / 100;
  const currentPrice = Math.max(PRODUCT_MIN_PRICE, rawPrice);
  
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
 * Calculate commodity prices for all resources given supply/demand data
 * @param resourceSupply - Map of resource to actual extraction output
 * @param resourceDemand - Map of resource to actual production consumption
 */
export function calculateAllCommodityPrices(
  resourceSupply: Record<Resource, number>,
  resourceDemand: Record<Resource, number>
): CommodityPrice[] {
  return RESOURCES.map(resource => 
    calculateCommodityPrice(
      resource,
      resourceSupply[resource] || 0,
      resourceDemand[resource] || 0
    )
  );
}

/**
 * Get all commodity prices using static resource pools (fallback/legacy)
 * @deprecated Use calculateAllCommodityPrices with actual database counts instead
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

// ============================================================================
// MANUFACTURED PRODUCTS SYSTEM
// Products are created by production units and consumed by other sectors
// ============================================================================

// Product types that production units can create
export const PRODUCTS = [
  'Technology Products',
  'Manufactured Goods',
  'Electricity',
  'Food Products',
  'Construction Capacity',
  'Pharmaceutical Products',
  'Defense Equipment',
  'Logistics Capacity',
] as const;

export type Product = typeof PRODUCTS[number];

// What each sector's production units produce (null = doesn't produce products)
export const SECTOR_PRODUCTS: Record<Sector, Product | null> = {
  'Technology': 'Technology Products',
  'Finance': null,                    // Service sector
  'Healthcare': null,                 // Service sector (consumes pharma)
  'Manufacturing': 'Manufactured Goods',
  'Energy': 'Electricity',
  'Retail': null,                     // Service sector (sells goods)
  'Real Estate': null,                // Service sector (uses construction)
  'Transportation': 'Logistics Capacity',
  'Media': null,                      // Service sector
  'Telecommunications': null,         // Service sector
  'Agriculture': 'Food Products',
  'Defense': 'Defense Equipment',
  'Hospitality': null,                // Service sector
  'Construction': 'Construction Capacity',
  'Pharmaceuticals': 'Pharmaceutical Products',
  'Mining': null,                     // Extraction sector (extracts resources, doesn't produce products)
};

// What each sector's production units demand (products they need to operate)
// null = no product demand, array = can demand multiple products
export const SECTOR_PRODUCT_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,                              // Produces, doesn't consume products
  'Finance': ['Technology Products'],              // Trading systems, software
  'Healthcare': ['Pharmaceutical Products'],       // Medicine
  'Manufacturing': null,                           // Produces, doesn't consume products
  'Energy': null,                                  // Produces, doesn't consume products
  'Retail': ['Manufactured Goods'],                // Sells manufactured goods
  'Real Estate': ['Construction Capacity'],        // Needs construction for development
  'Transportation': null,                          // Produces logistics
  'Media': ['Technology Products'],                // Broadcasting equipment, software
  'Telecommunications': ['Technology Products'],   // Network equipment
  'Agriculture': null,                             // Produces, doesn't consume products
  'Defense': null,                                 // Produces, doesn't consume products
  'Hospitality': ['Food Products'],                // Restaurants, hotels
  'Construction': null,                            // Produces, doesn't consume products
  'Pharmaceuticals': null,                         // Produces, doesn't consume products
  'Mining': null,                                  // Extraction sector, doesn't consume products
};

// What each sector's retail units demand (products they need to sell/operate)
// null = cannot build retail units in this sector
export const SECTOR_RETAIL_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,                              // Cannot build retail units
  'Finance': ['Technology Products'],              // Financial products/services need tech
  'Healthcare': ['Pharmaceutical Products'],       // Pharmacies, healthcare retail
  'Manufacturing': null,                           // Cannot build retail units
  'Energy': null,                                  // Cannot build retail units
  'Retail': ['Manufactured Goods'],                // General retail stores
  'Real Estate': ['Construction Capacity'],        // Real estate sales offices
  'Transportation': ['Logistics Capacity'],        // Shipping centers, logistics hubs
  'Media': ['Technology Products'],                // Media retail (streaming, etc)
  'Telecommunications': ['Technology Products'],   // Telecom stores
  'Agriculture': ['Food Products'],                // Grocery stores, farmers markets
  'Defense': ['Defense Equipment'],                // Military retail/supply
  'Hospitality': ['Food Products'],                // Restaurants, hotels
  'Construction': ['Construction Capacity'],       // Construction retail/showrooms
  'Pharmaceuticals': ['Pharmaceutical Products'],  // Pharmacies
  'Mining': null,                                  // Cannot build retail units
};

// What each sector's service units demand (products they need to provide services)
// null = cannot build service units in this sector
export const SECTOR_SERVICE_DEMANDS: Record<Sector, Product[] | null> = {
  'Technology': null,                              // Cannot build service units
  'Finance': ['Technology Products', 'Electricity'],              // Banking systems
  'Healthcare': ['Pharmaceutical Products', 'Electricity'],       // Hospitals, clinics
  'Manufacturing': ['Manufactured Goods', 'Electricity'],                           // Manufacturing services
  'Energy': ['Electricity'],                       // Energy services
  'Retail': ['Manufactured Goods', 'Electricity'],                // Retail services
  'Real Estate': ['Construction Capacity', 'Electricity'],        // Real estate management
  'Transportation': ['Logistics Capacity', 'Electricity'],        // Transportation services
  'Media': ['Technology Products', 'Electricity'],                // Media production/broadcasting
  'Telecommunications': ['Technology Products', 'Electricity'],   // Network services
  'Agriculture': ['Food Products', 'Electricity'],                // Agricultural services
  'Defense': ['Technology Products', 'Defense Equipment', 'Electricity'],  // Defense services need both tech and equipment
  'Hospitality': ['Food Products', 'Electricity'],                // Hospitality services
  'Construction': ['Construction Capacity', 'Electricity'],       // Construction services
  'Pharmaceuticals': ['Pharmaceutical Products', 'Electricity'],  // Pharmaceutical services
  'Mining': null,                                  // Cannot build service units
};

// Get what product a sector produces
export function getSectorProduct(sector: Sector): Product | null {
  return SECTOR_PRODUCTS[sector];
}

// Get what products a sector demands
export function getSectorProductDemands(sector: Sector): Product[] | null {
  return SECTOR_PRODUCT_DEMANDS[sector];
}

// Check if a sector produces products
export function sectorProducesProduct(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  return SECTOR_PRODUCTS[sector] !== null;
}

// Check if a sector demands products
export function sectorDemandsProducts(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const demands = SECTOR_PRODUCT_DEMANDS[sector];
  return demands !== null && demands.length > 0;
}

// Get all sectors that produce a specific product
export function getSectorsProducingProduct(product: Product): Sector[] {
  const sectors: Sector[] = [];
  for (const [sector, produced] of Object.entries(SECTOR_PRODUCTS)) {
    if (produced === product) {
      sectors.push(sector as Sector);
    }
  }
  return sectors;
}

// Get all sectors that demand a specific product
export function getSectorsDemandingProduct(product: Product): Sector[] {
  const sectors: Sector[] = [];

  // Check production unit demands
  for (const [sector, demands] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
    if (demands && demands.includes(product)) {
      sectors.push(sector as Sector);
    }
  }

  // Check retail unit demands
  for (const [sector, demands] of Object.entries(SECTOR_RETAIL_DEMANDS)) {
    if (demands && demands.includes(product) && !sectors.includes(sector as Sector)) {
      sectors.push(sector as Sector);
    }
  }

  // Check service unit demands
  for (const [sector, demands] of Object.entries(SECTOR_SERVICE_DEMANDS)) {
    if (demands && demands.includes(product) && !sectors.includes(sector as Sector)) {
      sectors.push(sector as Sector);
    }
  }

  return sectors;
}

// Get what products a sector's retail units demand
export function getSectorRetailDemands(sector: Sector): Product[] | null {
  return SECTOR_RETAIL_DEMANDS[sector];
}

// Get what products a sector's service units demand
export function getSectorServiceDemands(sector: Sector): Product[] | null {
  return SECTOR_SERVICE_DEMANDS[sector];
}

// Check if a sector can build production units
export function sectorCanBuildProduction(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  return SECTOR_PRODUCTS[sector as Sector] !== null;
}

// Check if a sector can build retail units
export function sectorCanBuildRetail(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const demands = SECTOR_RETAIL_DEMANDS[sector];
  return demands !== null && demands.length > 0;
}

// Check if a sector can build service units
export function sectorCanBuildService(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const demands = SECTOR_SERVICE_DEMANDS[sector];
  return demands !== null && demands.length > 0;
}

// Check if a sector's retail units demand products
export function sectorRetailDemandsProducts(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const demands = SECTOR_RETAIL_DEMANDS[sector];
  return demands !== null && demands.length > 0;
}

// Check if a sector's service units demand products
export function sectorServiceDemandsProducts(sector: string): boolean {
  if (!isValidSector(sector)) return false;
  const demands = SECTOR_SERVICE_DEMANDS[sector];
  return demands !== null && demands.length > 0;
}

// ============================================================================
// PRODUCT PRICING
// Price based on scarcity (supply vs demand) with low floor
// Supply = total production units in producing sectors
// Demand = total production units in demanding sectors
// ============================================================================

// Minimum price floor for products (very low)
export const PRODUCT_MIN_PRICE = 10;

// Base value per unit for price calculation (used as reference)
export const PRODUCT_REFERENCE_VALUES: Record<Product, number> = {
  'Technology Products': 5000,
  'Manufactured Goods': 1500,
  'Electricity': 200,
  'Food Products': 500,
  'Construction Capacity': 2500,
  'Pharmaceutical Products': 8000,
  'Defense Equipment': 15000,
  'Logistics Capacity': 1000,
};

/**
 * Get base product price (reference value) without supply/demand calculation
 * Used for static economics calculations
 */
export function getBaseProductPrice(product: Product): number {
  return PRODUCT_REFERENCE_VALUES[product];
}

export interface ProductMarketData {
  product: Product;
  supply: number;              // Total production units creating this product
  demand: number;              // Total production units needing this product
  currentPrice: number;        // Calculated price based on scarcity
  scarcityFactor: number;      // demand/supply ratio
  referenceValue: number;      // Base reference value
  producingSectors: Sector[];
  demandingSectors: Sector[];
}

/**
 * Calculate product price based on supply and demand
 * This is a static calculation - actual supply/demand comes from database
 * 
 * @param product - The product type
 * @param totalSupply - Total production units in sectors that produce this product
 * @param totalDemand - Total production units in sectors that demand this product
 */
export function calculateProductPrice(
  product: Product,
  totalSupply: number,
  totalDemand: number
): ProductMarketData {
  const referenceValue = PRODUCT_REFERENCE_VALUES[product];
  const producingSectors = getSectorsProducingProduct(product);
  const demandingSectors = getSectorsDemandingProduct(product);
  
  // Calculate scarcity factor without floors (truly unlimited)
  let scarcityFactor: number;
  if (totalSupply > 0 || totalDemand > 0) {
    scarcityFactor = totalDemand / Math.max(0.01, totalSupply);
  } else {
    scarcityFactor = 1.0;
  }
  
  // Calculate price: referenceValue * scarcityFactor (no floor)
  let currentPrice = Math.round(referenceValue * scarcityFactor * 100) / 100;
  
  return {
    product,
    supply: totalSupply,
    demand: totalDemand,
    currentPrice,
    scarcityFactor,
    referenceValue,
    producingSectors,
    demandingSectors,
  };
}

// ============================================================================
// PRODUCT EFFICIENCY CALCULATION
// Same formula as resources: efficiency = min(1, available / required)
// ============================================================================

export interface ProductEfficiencyResult {
  efficiency: number;           // 0.0 to 1.0
  availableProducts: number;    // How many product units available (national supply)
  requiredProducts: number;     // How many product units needed (production unit count)
  productType: Product | null;  // The product type required (null if sector needs none)
  products: Product[];          // All products this sector demands
  hasShortage: boolean;         // True if efficiency < 1.0
  shortageDetails: Array<{
    product: Product;
    available: number;
    required: number;
    efficiency: number;
  }>;
}

/**
 * Calculate product efficiency for a sector
 * For sectors that demand multiple products, efficiency is the minimum across all
 * 
 * @param sector - The sector type
 * @param productionUnitCount - Number of production units operating
 * @param productSupplies - Map of product -> total national supply
 * @returns Efficiency calculation result
 */
export function calculateProductEfficiency(
  sector: string,
  productionUnitCount: number,
  productSupplies: Record<Product, number>
): ProductEfficiencyResult {
  // If sector doesn't demand products, always 100% efficient
  if (!isValidSector(sector)) {
    return {
      efficiency: 1.0,
      availableProducts: 0,
      requiredProducts: 0,
      productType: null,
      products: [],
      hasShortage: false,
      shortageDetails: [],
    };
  }

  const demandedProducts = SECTOR_PRODUCT_DEMANDS[sector];
  
  // Sectors without product requirements are always efficient
  if (demandedProducts === null || demandedProducts.length === 0) {
    return {
      efficiency: 1.0,
      availableProducts: 0,
      requiredProducts: 0,
      productType: null,
      products: [],
      hasShortage: false,
      shortageDetails: [],
    };
  }

  // No production units = no requirements = 100% efficient
  if (productionUnitCount <= 0) {
    return {
      efficiency: 1.0,
      availableProducts: 0,
      requiredProducts: 0,
      productType: demandedProducts[0],
      products: demandedProducts,
      hasShortage: false,
      shortageDetails: [],
    };
  }

  // Calculate efficiency for each demanded product
  const shortageDetails: Array<{
    product: Product;
    available: number;
    required: number;
    efficiency: number;
  }> = [];
  
  let minEfficiency = 1.0;
  let totalAvailable = 0;
  const requiredProducts = productionUnitCount; // 1 product unit per production unit
  
  for (const product of demandedProducts) {
    const available = productSupplies[product] || 0;
    const productEfficiency = Math.min(1.0, available / requiredProducts);
    
    shortageDetails.push({
      product,
      available,
      required: requiredProducts,
      efficiency: productEfficiency,
    });
    
    if (productEfficiency < minEfficiency) {
      minEfficiency = productEfficiency;
    }
    totalAvailable += available;
  }
  
  return {
    efficiency: minEfficiency,
    availableProducts: totalAvailable,
    requiredProducts,
    productType: demandedProducts[0], // Primary product
    products: demandedProducts,
    hasShortage: minEfficiency < 1.0,
    shortageDetails,
  };
}

/**
 * Get combined efficiency considering both resources AND products
 * Final efficiency = resourceEfficiency * productEfficiency
 * 
 * @param stateCode - The US state code
 * @param sector - The sector type
 * @param productionUnitCount - Number of production units
 * @param productSupplies - Map of product -> total national supply
 */
export function getCombinedEfficiency(
  stateCode: string,
  sector: string,
  productionUnitCount: number,
  productSupplies: Record<Product, number>
): {
  resourceEfficiency: number;
  productEfficiency: number;
  combinedEfficiency: number;
  resourceType: Resource | null;
  productTypes: Product[];
} {
  const resourceResult = calculateResourceEfficiency(stateCode, sector, productionUnitCount);
  const productResult = calculateProductEfficiency(sector, productionUnitCount, productSupplies);
  
  return {
    resourceEfficiency: resourceResult.efficiency,
    productEfficiency: productResult.efficiency,
    combinedEfficiency: resourceResult.efficiency * productResult.efficiency,
    resourceType: resourceResult.resourceType,
    productTypes: productResult.products,
  };
}

// ============================================================================
// PRODUCT INFO HELPERS
// ============================================================================

// Get product info for display
export function getProductInfo(product: Product): {
  name: Product;
  referenceValue: number;
  producingSectors: Sector[];
  demandingSectors: Sector[];
  inputResource: Resource | null;
} {
  const producingSectors = getSectorsProducingProduct(product);
  const demandingSectors = getSectorsDemandingProduct(product);
  
  // Find what resource is needed to produce this product
  let inputResource: Resource | null = null;
  for (const sector of producingSectors) {
    const resource = SECTOR_RESOURCES[sector];
    if (resource) {
      inputResource = resource;
      break;
    }
  }
  
  return {
    name: product,
    referenceValue: PRODUCT_REFERENCE_VALUES[product],
    producingSectors,
    demandingSectors,
    inputResource,
  };
}

// Get all products with their info
export function getAllProductsInfo(): Array<ReturnType<typeof getProductInfo>> {
  return PRODUCTS.map(product => getProductInfo(product));
}

// Get the full production chain for a sector
export function getSectorProductionChain(sector: Sector): {
  sector: Sector;
  consumesResource: Resource | null;
  producesProduct: Product | null;
  consumesProducts: Product[] | null;
} {
  return {
    sector,
    consumesResource: SECTOR_RESOURCES[sector],
    producesProduct: SECTOR_PRODUCTS[sector],
    consumesProducts: SECTOR_PRODUCT_DEMANDS[sector],
  };
}

