const assert = require('assert');

function calcProductionRevenue(referenceValue, currentPrice, outputRate) {
  return referenceValue + currentPrice * outputRate;
}

function calcExtractionRevenue(basePrice, currentPrice, outputRate) {
  return basePrice + currentPrice * outputRate;
}

function calcRetailRevenue(baseRevenue, demands) {
  const priceOutput = demands.reduce((s, d) => s + d.price * d.amount, 0);
  return baseRevenue + priceOutput;
}

function run() {
  assert.strictEqual(calcProductionRevenue(5000, 6000, 1.0), 11000);
  assert.strictEqual(calcExtractionRevenue(9000, 100, 2.0), 9200);
  assert.strictEqual(calcRetailRevenue(500, [{ price: 1500, amount: 0.5 }]), 1250);
  console.log('Revenue breakdown tests passed');
}

run();

