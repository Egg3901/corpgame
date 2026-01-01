const assert = require('assert');

function sortItems(items, key, dir) {
  const map = {
    revenue: (x) => x.revenue_96h,
    profit: (x) => x.profit_96h,
    assets: (x) => x.assets,
    market_cap: (x) => x.market_cap,
    share_price: (x) => x.share_price,
    book_value: (x) => x.book_value,
    name: (x) => x.name,
  };
  return items.slice().sort((a, b) => {
    const ka = map[key](a);
    const kb = map[key](b);
    if (typeof ka === 'string') {
      return dir === 'asc' ? String(ka).localeCompare(String(kb)) : String(kb).localeCompare(String(ka));
    }
    return dir === 'asc' ? Number(ka) - Number(kb) : Number(kb) - Number(ka);
  });
}

function run() {
  const items = [
    { name: 'A', revenue_96h: 100, profit_96h: 10, assets: 500, market_cap: 1000, share_price: 2.5, book_value: 200 },
    { name: 'B', revenue_96h: 300, profit_96h: 30, assets: 400, market_cap: 900, share_price: 1.5, book_value: 100 },
    { name: 'C', revenue_96h: 200, profit_96h: 20, assets: 600, market_cap: 1100, share_price: 3.5, book_value: 300 },
  ];
  const sortedRev = sortItems(items, 'revenue', 'desc');
  assert.strictEqual(sortedRev[0].name, 'B');
  const sortedAssetsAsc = sortItems(items, 'assets', 'asc');
  assert.strictEqual(sortedAssetsAsc[0].name, 'B');
  const sortedNameAsc = sortItems(items, 'name', 'asc');
  assert.strictEqual(sortedNameAsc[0].name, 'A');
  console.log('Sorting/filtering tests passed');
}

run();

