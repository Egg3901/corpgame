const assert = require('assert');

function roundPrice(value) {
  return Math.round((typeof value === 'number' ? value : parseFloat(value)) * 100) / 100;
}

function formatCurrency(value, locale, currency) {
  const v = roundPrice(value);
  return new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function applyDiscount(price, pct) {
  const p = typeof price === 'number' ? price : parseFloat(price);
  let d = typeof pct === 'number' ? pct : parseFloat(pct);
  if (isNaN(d)) d = 0;
  if (d < 0) d = 0;
  if (d > 100) d = 100;
  return roundPrice(p * (1 - d / 100));
}

function computeCoverage(supply, demand) {
  const s = Math.max(0, Number(supply) || 0);
  const d = Math.max(0.0001, Number(demand) || 0);
  return s / d;
}

function categorizeDemandLevel(supply, demand, salesVelocity = 0.5) {
  const coverage = computeCoverage(supply, demand);
  const v = Math.max(0, Math.min(1, salesVelocity));
  if (coverage > 1.1) return 'low';
  if (coverage < 0.8 || v >= 0.7) return 'high';
  return 'medium';
}

function run() {
  assert.strictEqual(roundPrice(1.234), 1.23);
  assert.strictEqual(roundPrice(1.235), 1.24);
  assert.ok(formatCurrency(1234.5, 'en-US', 'USD').includes('$1,234.50'));
  const eur = formatCurrency(1234.5, 'de-DE', 'EUR');
  assert.ok(eur.includes('1.234,50'));
  const discounted = applyDiscount(100, 15);
  assert.strictEqual(discounted, 85.0);
  assert.strictEqual(applyDiscount(100, -10), 100.0);
  assert.strictEqual(applyDiscount(100, 150), 0.0);
  assert.strictEqual(categorizeDemandLevel(80, 100), 'medium');
  assert.strictEqual(categorizeDemandLevel(50, 100), 'high');
  assert.strictEqual(categorizeDemandLevel(120, 100), 'low');
  console.log('All tests passed');
}

run();
