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

// Simplified mapping for seeding
const SECTOR_CONFIGS = [
  { name: 'Technology', display_order: 1, produced_product: 'Software', primary_resource: 'Rare Earth', can_extract: false },
  { name: 'Finance', display_order: 2, produced_product: 'Financial Services', primary_resource: null, can_extract: false },
  { name: 'Healthcare', display_order: 3, produced_product: 'Medical Services', primary_resource: null, can_extract: false },
  { name: 'Light Industry', display_order: 4, produced_product: 'Manufactured Goods', primary_resource: null, can_extract: false },
  { name: 'Energy', display_order: 5, produced_product: 'Electricity', primary_resource: null, can_extract: true },
  { name: 'Retail', display_order: 6, produced_product: 'Consumer Goods', primary_resource: null, can_extract: false },
  { name: 'Real Estate', display_order: 7, produced_product: 'Housing', primary_resource: null, can_extract: false },
  { name: 'Transportation', display_order: 8, produced_product: 'Logistics', primary_resource: null, can_extract: false },
  { name: 'Media', display_order: 9, produced_product: 'Content', primary_resource: null, can_extract: false },
  { name: 'Telecommunications', display_order: 10, produced_product: 'Data Services', primary_resource: 'Copper', can_extract: false },
  { name: 'Agriculture', display_order: 11, produced_product: 'Food', primary_resource: 'Fertile Land', can_extract: true },
  { name: 'Defense', display_order: 12, produced_product: 'Defense Systems', primary_resource: null, can_extract: false },
  { name: 'Hospitality', display_order: 13, produced_product: 'Hospitality Services', primary_resource: null, can_extract: false },
  { name: 'Construction', display_order: 14, produced_product: 'Infrastructure', primary_resource: null, can_extract: false },
  { name: 'Pharmaceuticals', display_order: 15, produced_product: 'Medicine', primary_resource: 'Chemical Compounds', can_extract: true },
  { name: 'Mining', display_order: 16, produced_product: null, primary_resource: null, can_extract: true },
  { name: 'Heavy Industry', display_order: 17, produced_product: 'Steel', primary_resource: null, can_extract: false },
  { name: 'Forestry', display_order: 18, produced_product: 'Timber', primary_resource: null, can_extract: true },
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

const PRODUCT_CONFIGS = [
  { name: 'Software', reference_value: 200, min_price: 50, display_order: 1 },
  { name: 'Financial Services', reference_value: 180, min_price: 40, display_order: 2 },
  { name: 'Medical Services', reference_value: 250, min_price: 80, display_order: 3 },
  { name: 'Manufactured Goods', reference_value: 120, min_price: 30, display_order: 4 },
  { name: 'Electricity', reference_value: 100, min_price: 20, display_order: 5 },
  { name: 'Consumer Goods', reference_value: 90, min_price: 20, display_order: 6 },
  { name: 'Housing', reference_value: 500, min_price: 200, display_order: 7 },
  { name: 'Logistics', reference_value: 110, min_price: 30, display_order: 8 },
  { name: 'Content', reference_value: 80, min_price: 10, display_order: 9 },
  { name: 'Data Services', reference_value: 130, min_price: 40, display_order: 10 },
  { name: 'Food', reference_value: 60, min_price: 15, display_order: 11 },
  { name: 'Defense Systems', reference_value: 400, min_price: 100, display_order: 12 },
  { name: 'Hospitality Services', reference_value: 150, min_price: 50, display_order: 13 },
  { name: 'Infrastructure', reference_value: 300, min_price: 80, display_order: 14 },
  { name: 'Medicine', reference_value: 220, min_price: 60, display_order: 15 },
  { name: 'Steel', reference_value: 140, min_price: 40, display_order: 16 },
  { name: 'Timber', reference_value: 50, min_price: 15, display_order: 17 }, // Processed lumber
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

  // 4. Seed Unit Configs (Basic)
  const unitConfigs = db.collection('sector_unit_configs');
  await unitConfigs.deleteMany({});

  // Default unit types for each sector
  for (const s of SECTOR_CONFIGS) {
    // Production Unit
    if (s.produced_product) {
      await unitConfigs.insertOne({
        id: await getNextId(db, 'sector_unit_configs_id'),
        sector_name: s.name,
        unit_type: 'production',
        is_enabled: true,
        base_revenue: 0, // Calculated dynamically in game
        base_cost: 500,
        labor_cost: 100,
        output_rate: 10,
        created_at: now,
        updated_at: now
      });
    }

    // Extraction Unit
    if (s.can_extract) {
      await unitConfigs.insertOne({
        id: await getNextId(db, 'sector_unit_configs_id'),
        sector_name: s.name,
        unit_type: 'extraction',
        is_enabled: true,
        base_revenue: 0,
        base_cost: 300,
        labor_cost: 80,
        output_rate: 20,
        created_at: now,
        updated_at: now
      });
    }

    // Retail Unit (All sectors)
    await unitConfigs.insertOne({
      id: await getNextId(db, 'sector_unit_configs_id'),
      sector_name: s.name,
      unit_type: 'retail',
      is_enabled: true,
      base_revenue: 100,
      base_cost: 200,
      labor_cost: 50,
      output_rate: null,
      created_at: now,
      updated_at: now
    });
  }
  console.log('Seeded unit configs');

  // Note: Inputs/Outputs are complex to seed without full logic.
  // Leaving them empty might mean units don't consume/produce anything until configured.
  // However, `is_production_only` etc flags might be enough for basic logic, 
  // or the game falls back to hardcoded logic if DB is empty.
  // Given the complexity, this is a "Foundational" seed.
};
