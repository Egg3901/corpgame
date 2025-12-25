// Quick check for sectors missing demands
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
  'Defense': ['Defense Equipment'],
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
  'Defense': ['Technology Products', 'Defense Equipment', 'Electricity'],
  'Hospitality': ['Food Products', 'Electricity'],
  'Construction': ['Construction Capacity', 'Electricity'],
  'Pharmaceuticals': ['Pharmaceutical Products', 'Electricity'],
  'Mining': null,
};

console.log("Sectors with retail allowed but no demands:");
Object.entries(SECTOR_RETAIL_DEMANDS).forEach(([sector, demands]) => {
  if (demands === null) {
    console.log(`  ${sector}: Cannot build retail (correct)`);
  } else if (demands.length === 0) {
    console.log(`  ❌ ${sector}: Can build retail but has EMPTY demands array!`);
  } else {
    console.log(`  ✅ ${sector}: ${demands.join(', ')}`);
  }
});

console.log("\nSectors with service allowed but no demands:");
Object.entries(SECTOR_SERVICE_DEMANDS).forEach(([sector, demands]) => {
  if (demands === null) {
    console.log(`  ${sector}: Cannot build service (correct)`);
  } else if (demands.length === 0) {
    console.log(`  ❌ ${sector}: Can build service but has EMPTY demands array!`);
  } else {
    console.log(`  ✅ ${sector}: ${demands.join(', ')}`);
  }
});
