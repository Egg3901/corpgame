// Derived from lib/constants/sectors.ts

const SECTORS = [
  'Technology', 'Finance', 'Healthcare', 'Light Industry', 'Energy', 'Retail',
  'Real Estate', 'Transportation', 'Media', 'Telecommunications', 'Agriculture',
  'Defense', 'Hospitality', 'Construction', 'Pharmaceuticals', 'Mining',
  'Heavy Industry', 'Forestry'
];

const RESOURCES = [
  'Oil', 'Iron Ore', 'Rare Earth', 'Copper', 'Fertile Land', 'Lumber',
  'Chemical Compounds', 'Coal'
];

// Simplified mapping for seeding - aligned with lib/constants/sectors.ts SECTOR_PRODUCTS
const SECTOR_CONFIGS = [
  { name: 'Technology', display_order: 1, produced_product: 'Technology Products', primary_resource: 'Rare Earth', can_extract: false },
  { name: 'Finance', display_order: 2, produced_product: null, primary_resource: null, can_extract: false },           // Service sector
  { name: 'Healthcare', display_order: 3, produced_product: null, primary_resource: null, can_extract: false },        // Service sector
  { name: 'Light Industry', display_order: 4, produced_product: 'Manufactured Goods', primary_resource: null, can_extract: false },
  { name: 'Energy', display_order: 5, produced_product: 'Electricity', primary_resource: null, can_extract: true },
  { name: 'Retail', display_order: 6, produced_product: null, primary_resource: null, can_extract: false },            // Service sector
  { name: 'Real Estate', display_order: 7, produced_product: null, primary_resource: null, can_extract: false },       // Service sector
  { name: 'Transportation', display_order: 8, produced_product: 'Logistics Capacity', primary_resource: null, can_extract: false },
  { name: 'Media', display_order: 9, produced_product: null, primary_resource: null, can_extract: false },             // Service sector
  { name: 'Telecommunications', display_order: 10, produced_product: null, primary_resource: 'Copper', can_extract: false }, // Service sector
  { name: 'Agriculture', display_order: 11, produced_product: 'Food Products', primary_resource: 'Fertile Land', can_extract: true },
  { name: 'Defense', display_order: 12, produced_product: 'Defense Equipment', primary_resource: null, can_extract: false },
  { name: 'Hospitality', display_order: 13, produced_product: null, primary_resource: null, can_extract: false },      // Service sector
  { name: 'Construction', display_order: 14, produced_product: 'Construction Capacity', primary_resource: null, can_extract: false },
  { name: 'Pharmaceuticals', display_order: 15, produced_product: 'Pharmaceutical Products', primary_resource: 'Chemical Compounds', can_extract: true },
  { name: 'Mining', display_order: 16, produced_product: null, primary_resource: null, can_extract: true },            // Extraction only
  { name: 'Heavy Industry', display_order: 17, produced_product: 'Steel', primary_resource: null, can_extract: false },
  { name: 'Forestry', display_order: 18, produced_product: null, primary_resource: null, can_extract: true },          // Extraction only
];

const RESOURCE_CONFIGS = [
  { name: 'Oil', base_price: 80, display_order: 1 },
  { name: 'Iron Ore', base_price: 60, display_order: 2 },
  { name: 'Rare Earth', base_price: 150, display_order: 3 },
  { name: 'Copper', base_price: 90, display_order: 4 },
  { name: 'Fertile Land', base_price: 1000, display_order: 5 }, // Land is special, high price
  { name: 'Lumber', base_price: 40, display_order: 6 },
  { name: 'Chemical Compounds', base_price: 110, display_order: 7 },
  { name: 'Coal', base_price: 50, display_order: 8 },
];

// Aligned with lib/constants/sectors.ts PRODUCTS array (9 products)
const PRODUCT_CONFIGS = [
  { name: 'Technology Products', reference_value: 200, min_price: 50, display_order: 1 },
  { name: 'Manufactured Goods', reference_value: 120, min_price: 30, display_order: 2 },
  { name: 'Electricity', reference_value: 100, min_price: 20, display_order: 3 },
  { name: 'Food Products', reference_value: 60, min_price: 15, display_order: 4 },
  { name: 'Construction Capacity', reference_value: 300, min_price: 80, display_order: 5 },
  { name: 'Pharmaceutical Products', reference_value: 220, min_price: 60, display_order: 6 },
  { name: 'Defense Equipment', reference_value: 400, min_price: 100, display_order: 7 },
  { name: 'Logistics Capacity', reference_value: 110, min_price: 30, display_order: 8 },
  { name: 'Steel', reference_value: 140, min_price: 40, display_order: 9 },
];

module.exports = async function seedSectors(db, getNextId) {
  const now = new Date();

  // 1. Seed Sectors
  const sectorConfigs = db.collection('sector_configs');
  await sectorConfigs.deleteMany({});
  
  for (const s of SECTOR_CONFIGS) {
    await sectorConfigs.insertOne({
      id: await getNextId(db, 'sector_configs_id'),
      sector_name: s.name,
      display_order: s.display_order,
      is_enabled: true,  // All sectors enabled by default, toggle via admin panel
      is_production_only: !s.can_extract, // Simplification
      can_extract: s.can_extract,
      produced_product: s.produced_product,
      primary_resource: s.primary_resource,
      created_at: now,
      updated_at: now
    });
  }
  console.log(`Seeded ${SECTOR_CONFIGS.length} sector configs`);

  // 2. Seed Resources
  const resourceConfigs = db.collection('resource_configs');
  await resourceConfigs.deleteMany({});

  for (const r of RESOURCE_CONFIGS) {
    await resourceConfigs.insertOne({
      id: await getNextId(db, 'resource_configs_id'),
      resource_name: r.name,
      base_price: r.base_price,
      display_order: r.display_order,
      created_at: now,
      updated_at: now
    });
  }
  console.log(`Seeded ${RESOURCE_CONFIGS.length} resource configs`);

  // 3. Seed Products
  const productConfigs = db.collection('product_configs');
  await productConfigs.deleteMany({});

  for (const p of PRODUCT_CONFIGS) {
    await productConfigs.insertOne({
      id: await getNextId(db, 'product_configs_id'),
      product_name: p.name,
      reference_value: p.reference_value,
      min_price: p.min_price,
      display_order: p.display_order,
      created_at: now,
      updated_at: now
    });
  }
  console.log(`Seeded ${PRODUCT_CONFIGS.length} product configs`);

  // 4. Seed Unit Configs - ALL 4 unit types for ALL sectors (toggleable via admin panel)
  const unitConfigs = db.collection('sector_unit_configs');
  await unitConfigs.deleteMany({});

  // Service-oriented sectors that have service enabled by default
  const SERVICE_SECTORS = ['Finance', 'Healthcare', 'Real Estate', 'Media', 'Telecommunications', 'Hospitality'];

  // Create all 4 unit types for every sector
  for (const s of SECTOR_CONFIGS) {
    const unitTypes = ['production', 'retail', 'service', 'extraction'];

    for (const unitType of unitTypes) {
      // Determine default enabled state and costs based on sector type
      let isEnabled = false;
      let baseCost = 500;
      let laborCost = 100;
      let outputRate = null;
      let baseRevenue = 0;

      if (unitType === 'production') {
        isEnabled = !!s.produced_product;  // Enabled if sector produces something
        outputRate = 10;
      } else if (unitType === 'extraction') {
        isEnabled = s.can_extract;
        baseCost = 300;
        laborCost = 80;
        outputRate = 20;
      } else if (unitType === 'retail') {
        isEnabled = true;  // Retail enabled for all sectors
        baseCost = 150;
        laborCost = 25;
        baseRevenue = 100;
      } else if (unitType === 'service') {
        isEnabled = SERVICE_SECTORS.includes(s.name);
        baseCost = 250;
        laborCost = 50;
      }

      await unitConfigs.insertOne({
        id: await getNextId(db, 'sector_unit_configs_id'),
        sector_name: s.name,
        unit_type: unitType,
        is_enabled: isEnabled,
        base_revenue: baseRevenue,
        base_cost: baseCost,
        labor_cost: laborCost,
        output_rate: outputRate,
        created_at: now,
        updated_at: now
      });
    }
  }
  console.log(`Seeded ${SECTOR_CONFIGS.length * 4} unit configs (4 types x ${SECTOR_CONFIGS.length} sectors)`);

  // Note: Inputs/Outputs are complex to seed without full logic.
  // Leaving them empty might mean units don't consume/produce anything until configured.
  // However, `is_production_only` etc flags might be enough for basic logic, 
  // or the game falls back to hardcoded logic if DB is empty.
  // Given the complexity, this is a "Foundational" seed.
};
