const assert = require('assert');

function loadConstants() {
  const c = require('../dist/constants/sectors.js');
  return c;
}

function run() {
  const C = loadConstants();
  // Rare Earth base price adjusted
  assert.strictEqual(C.RESOURCE_BASE_PRICES['Rare Earth'], 9000);

  // No cap: commodity scarcity should exceed 3 when demand >> supply
  const com = C.calculateCommodityPrice('Rare Earth', 10, 100);
  assert.ok(com.scarcityFactor > 3.0, 'Commodity scarcity not capped');

  // No cap: product scarcity should exceed 3 when demand >> supply
  const prod = C.calculateProductPrice('Technology Products', 10, 100);
  assert.ok(prod.scarcityFactor > 3.0, 'Product scarcity not capped');

  // Reference value present via getter
  assert.ok(C.getBaseProductPrice('Technology Products') > 0);

  console.log('Pricing cap tests passed');
}

run();
