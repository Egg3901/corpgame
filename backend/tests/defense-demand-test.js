/**
 * Test: Verify Defense Equipment demand calculation
 * FID-20251225-001
 */

const path = require('path');

// Load the compiled BusinessUnitCalculator
async function runTest() {
  try {
    const { businessUnitCalculator } = require('../dist/services/BusinessUnitCalculator.js');
    const { SectorCalculator } = require('../dist/services/SectorCalculator.js');

    console.log('=== Defense Equipment Demand Test ===\n');

    // Test 1: Direct BusinessUnitCalculator test
    console.log('Test 1: BusinessUnitCalculator.computeTotalProductDemand');
    const counts = { production: 0, retail: 5, service: 3, extraction: 0 };
    const demand = businessUnitCalculator.computeTotalProductDemand('Defense', 'Defense Equipment', counts);
    console.log(`  Defense sector with 5 retail, 3 service units`);
    console.log(`  Defense Equipment demand: ${demand}`);
    console.log(`  Expected: 5 * 1.0 (retail) + 3 * 1.0 (service) = 8`);
    console.log(`  Result: ${demand === 8 ? 'PASS' : 'FAIL'}\n`);

    // Test 2: SectorCalculator aggregate test
    console.log('Test 2: SectorCalculator.computeProductSupplyDemand');
    const calc = new SectorCalculator();
    const unitMaps = {
      production: { 'Defense': 2 },
      retail: { 'Defense': 5 },
      service: { 'Defense': 3 },
      extraction: {},
    };
    const result = calc.computeProductSupplyDemand(unitMaps, ['Defense Equipment']);
    console.log(`  Unit maps: production=2, retail=5, service=3`);
    console.log(`  Supply: ${result.supply['Defense Equipment']} (expected: 2 * 1.0 = 2)`);
    console.log(`  Demand: ${result.demand['Defense Equipment']} (expected: 5*1.0 + 3*1.0 = 8)`);
    console.log(`  Supply correct: ${result.supply['Defense Equipment'] === 2 ? 'PASS' : 'FAIL'}`);
    console.log(`  Demand correct: ${result.demand['Defense Equipment'] === 8 ? 'PASS' : 'FAIL'}\n`);

    // Test 3: Check SECTOR_RULES are applied
    console.log('Test 3: SECTOR_RULES application');
    const { SECTOR_RULES } = require('../dist/services/BusinessUnitCalculator.js');
    console.log(`  Defense rules: ${JSON.stringify(SECTOR_RULES['Defense'])}`);
    console.log(`  Manufacturing rules: ${JSON.stringify(SECTOR_RULES['Manufacturing'])}`);
    console.log(`  Result: ${SECTOR_RULES['Defense']?.retailConsumption === 1.0 ? 'PASS' : 'FAIL'}\n`);

    // Test 4: Compare with non-Defense sector (should use default rates)
    console.log('Test 4: Non-Defense sector uses default rates');
    const retailDemand = businessUnitCalculator.computeTotalProductDemand('Retail', 'Manufactured Goods', { production: 0, retail: 5, service: 0, extraction: 0 });
    console.log(`  Retail sector with 5 retail units demanding Manufactured Goods`);
    console.log(`  Demand: ${retailDemand} (expected: 5 * 2.0 = 10)`);
    console.log(`  Result: ${retailDemand === 10 ? 'PASS' : 'FAIL'}\n`);

    console.log('=== All tests completed ===');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nNote: Run "npm run build" first to compile TypeScript');
  }
}

runTest();
