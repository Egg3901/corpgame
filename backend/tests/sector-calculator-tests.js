const assert = require('assert');

function loadCalculator() {
  // Load compiled calculator from dist
  const calc = require('../dist/services/SectorCalculator.js');
  return new calc.SectorCalculator();
}

function run() {
  const calculator = loadCalculator();
  const unitMaps = {
    production: { Manufacturing: 10, Energy: 5 },
    retail: { Retail: 8 },
    service: { Finance: 6 },
    extraction: { Agriculture: 4, Mining: 3 },
  };

  // Products
  const products = [
    'Manufactured Goods',
    'Electricity',
  ];
  const pd = calculator.computeProductSupplyDemand(unitMaps, products);
  assert.ok(pd.supply['Manufactured Goods'] > 0);
  assert.ok(pd.demand['Electricity'] > 0);

  // Resources
  const resources = [
    'Steel', 'Oil'
  ];
  const cd = calculator.computeCommoditySupplyDemand(unitMaps, resources);
  assert.ok(typeof cd.supply['Oil'] === 'number');
  assert.ok(cd.demand['Steel'] >= 0);

  console.log('Sector calculator tests passed');
}

run();

