// Check which sectors consume Defense Equipment

const SECTOR_PRODUCT_DEMANDS = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Manufacturing': null,
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': null,
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': null,
  'Defense': null, // Production units don't consume Defense Equipment
  'Hospitality': ['Food Products'],
  'Construction': null,
  'Pharmaceuticals': null,
  'Mining': null,
};

const SECTOR_RETAIL_DEMANDS = {
  'Technology': null,
  'Finance': ['Technology Products'],
  'Healthcare': ['Pharmaceutical Products'],
  'Manufacturing': null,
  'Energy': null,
  'Retail': ['Manufactured Goods'],
  'Real Estate': ['Construction Capacity'],
  'Transportation': ['Logistics Capacity'],
  'Media': ['Technology Products'],
  'Telecommunications': ['Technology Products'],
  'Agriculture': ['Food Products'],
  'Defense': ['Defense Equipment'], // Retail DOES consume it!
  'Hospitality': ['Food Products'],
  'Construction': ['Construction Capacity'],
  'Pharmaceuticals': ['Pharmaceutical Products'],
  'Mining': null,
};

const SECTOR_SERVICE_DEMANDS = {
  'Technology': null,
  'Finance': ['Technology Products', 'Electricity'],
  'Healthcare': ['Pharmaceutical Products', 'Electricity'],
  'Manufacturing': ['Manufactured Goods', 'Electricity'],
  'Energy': ['Electricity'],
  'Retail': ['Manufactured Goods', 'Electricity'],
  'Real Estate': ['Construction Capacity', 'Electricity'],
  'Transportation': ['Logistics Capacity', 'Electricity'],
  'Media': ['Technology Products', 'Electricity'],
  'Telecommunications': ['Technology Products', 'Electricity'],
  'Agriculture': ['Food Products', 'Electricity'],
  'Defense': ['Technology Products', 'Defense Equipment', 'Electricity'], // Service DOES consume it!
  'Hospitality': ['Food Products', 'Electricity'],
  'Construction': ['Construction Capacity', 'Electricity'],
  'Pharmaceuticals': ['Pharmaceutical Products', 'Electricity'],
  'Mining': null,
};

console.log("=== Defense Equipment Consumers ===\n");

console.log("Production units consuming Defense Equipment:");
Object.entries(SECTOR_PRODUCT_DEMANDS).forEach(([sector, demands]) => {
  if (demands && demands.includes('Defense Equipment')) {
    console.log(`  ✓ ${sector}`);
  }
});

console.log("\nRetail units consuming Defense Equipment:");
Object.entries(SECTOR_RETAIL_DEMANDS).forEach(([sector, demands]) => {
  if (demands && demands.includes('Defense Equipment')) {
    console.log(`  ✓ ${sector}`);
  }
});

console.log("\nService units consuming Defense Equipment:");
Object.entries(SECTOR_SERVICE_DEMANDS).forEach(([sector, demands]) => {
  if (demands && demands.includes('Defense Equipment')) {
    console.log(`  ✓ ${sector}`);
  }
});

console.log("\n=== Summary ===");
const productionConsumers = Object.entries(SECTOR_PRODUCT_DEMANDS).filter(([, d]) => d && d.includes('Defense Equipment')).length;
const retailConsumers = Object.entries(SECTOR_RETAIL_DEMANDS).filter(([, d]) => d && d.includes('Defense Equipment')).length;
const serviceConsumers = Object.entries(SECTOR_SERVICE_DEMANDS).filter(([, d]) => d && d.includes('Defense Equipment')).length;
const totalConsumers = productionConsumers + retailConsumers + serviceConsumers;

console.log(`Total sectors consuming Defense Equipment: ${totalConsumers}`);
console.log(`  Production: ${productionConsumers}`);
console.log(`  Retail: ${retailConsumers}`);
console.log(`  Service: ${serviceConsumers}`);

if (totalConsumers === 0) {
  console.log("\n⚠️  WARNING: Defense Equipment has NO consumers! This product cannot be sold!");
} else if (retailConsumers + serviceConsumers === 0) {
  console.log("\n⚠️  WARNING: Defense Equipment is only consumed by production units, not retail/service!");
} else if (totalConsumers < 3) {
  console.log("\n⚠️  WARNING: Defense Equipment has very limited demand (only consumed by Defense sector itself)!");
}
