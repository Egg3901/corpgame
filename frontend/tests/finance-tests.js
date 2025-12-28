const assert = require('assert');

function compute(params) {
  const periodHours = params.periodHours || 96;
  const flows = params.sectorUnitFlows || {};
  const ceo = params.fixedCosts?.ceoSalary || 0;
  const oh = params.fixedCosts?.overhead || 0;
  const sectors = [];
  params.entries.forEach((e) => {
    const units = {
      retail: Math.max(0, Number(e.retail_count || 0)),
      production: Math.max(0, Number(e.production_count || 0)),
      service: Math.max(0, Number(e.service_count || 0)),
      extraction: Math.max(0, Number(e.extraction_count || 0)),
    };
    const flow = flows[e.sector_type] || { retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, production: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } } };
    const econ = params.unitEconomics;
    let rev = 0;
    let varCost = 0;
    if (units.retail > 0) {
      rev += econ.retail.baseRevenue * periodHours * units.retail;
      varCost += econ.retail.baseCost * periodHours * units.retail;
    }
    if (units.service > 0) {
      rev += econ.service.baseRevenue * periodHours * units.service;
      varCost += econ.service.baseCost * periodHours * units.service;
    }
    if (units.production > 0) {
      const producedProduct = Object.keys(flow.production.outputs.products || {})[0] || null;
      let uRevH = econ.production.baseRevenue;
      let uCostH = econ.production.baseCost;
      if (producedProduct) {
        const outputRate = flow.production.outputs.products[producedProduct] || 0;
        const productPrice = params.productPrices[producedProduct]?.currentPrice || 0;
        uRevH = productPrice * outputRate;
        uCostH = 0;
        Object.entries(flow.production.inputs.resources || {}).forEach(([resource, amount]) => {
          const price = params.commodityPrices[resource]?.currentPrice || 0;
          uCostH += amount * price;
        });
        Object.entries(flow.production.inputs.products || {}).forEach(([product, amount]) => {
          const price = params.productPrices[product]?.currentPrice || 0;
          uCostH += amount * price;
        });
      }
      rev += uRevH * periodHours * units.production;
      varCost += uCostH * periodHours * units.production;
    }
    if (units.extraction > 0) {
      const producedResource = Object.keys(flow.extraction.outputs.resources || {})[0] || null;
      let uRevH = econ.extraction.baseRevenue;
      let uCostH = econ.extraction.baseCost;
      if (producedResource) {
        const outputRate = flow.extraction.outputs.resources[producedResource] || 0;
        const price = params.commodityPrices[producedResource]?.currentPrice || 0;
        uRevH = price * outputRate;
      }
      rev += uRevH * periodHours * units.extraction;
      varCost += uCostH * periodHours * units.extraction;
    }
    sectors.push({ revenue: rev, variableCosts: varCost });
  });
  const consolidatedRevenue = sectors.reduce((s, x) => s + x.revenue, 0);
  const consolidatedVariable = sectors.reduce((s, x) => s + x.variableCosts, 0);
  const fixed = ceo + oh;
  const net = consolidatedRevenue - (consolidatedVariable + fixed);
  return { revenue: consolidatedRevenue, variableCosts: consolidatedVariable, fixedCosts: fixed, netIncome: net };
}

function run() {
  const unitEconomics = {
    retail: { baseRevenue: 500, baseCost: 300 },
    production: { baseRevenue: 800, baseCost: 600 },
    service: { baseRevenue: 400, baseCost: 200 },
    extraction: { baseRevenue: 1000, baseCost: 700 },
  };
  const sectorUnitFlows = {
    Manufacturing: {
      retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      production: {
        inputs: { resources: { Steel: 0.5 }, products: { Electricity: 0.5 } },
        outputs: { resources: {}, products: { 'Manufactured Goods': 1.0 } },
      },
      service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
    },
    Energy: {
      retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      production: {
        inputs: { resources: {}, products: { Electricity: 0.0 } },
        outputs: { resources: {}, products: { Electricity: 1.0 } },
      },
      service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: { Oil: 2.0 }, products: {} } },
    },
  };
  const commodityPrices = { Steel: { currentPrice: 850 }, Oil: { currentPrice: 75 } };
  const productPrices = { Electricity: { currentPrice: 200 }, 'Manufactured Goods': { currentPrice: 1500 } };
  const entries = [
    { sector_type: 'Manufacturing', production_count: 2, service_count: 1 },
    { sector_type: 'Energy', production_count: 1, extraction_count: 3 },
  ];

  const result = compute({ entries, sectorUnitFlows, commodityPrices, productPrices, unitEconomics, periodHours: 96, fixedCosts: { ceoSalary: 10000, overhead: 5000 } });

  assert.ok(result.revenue > 0);
  assert.ok(result.variableCosts > 0);
  assert.strictEqual(Math.round(result.fixedCosts), 15000);
  assert.ok(Number.isFinite(result.netIncome));

  const neg = compute({ entries: [{ sector_type: 'Manufacturing', production_count: -5 }], sectorUnitFlows, commodityPrices, productPrices, unitEconomics });
  assert.ok(neg.revenue >= 0);
  assert.ok(neg.variableCosts >= 0);

  console.log('Finance tests passed');
}

run();

