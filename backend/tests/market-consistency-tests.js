const assert = require('assert');

function loadCalculator() {
  const calc = require('../dist/services/SectorCalculator.js');
  return new calc.SectorCalculator();
}

function run() {
  const calculator = loadCalculator();
  const unitMaps = {
    production: { Manufacturing: 10, Energy: 5 },
    retail: { Retail: 20 },
    service: { Finance: 8 },
    extraction: { Mining: 6, Agriculture: 3 },
  };

  const resources = ['Oil', 'Steel'];
  const pr = calculator.computeCommoditySupplyDemand(unitMaps, resources);
  assert.ok(pr.supply['Oil'] >= 0);
  assert.ok(pr.demand['Steel'] >= 0);

  const products = ['Manufactured Goods', 'Electricity'];
  const pd = calculator.computeProductSupplyDemand(unitMaps, products);
  assert.ok(pd.supply['Manufactured Goods'] >= 0);
  assert.ok(pd.demand['Electricity'] >= 0);

  console.log('Market consistency tests passed');
}

run();

