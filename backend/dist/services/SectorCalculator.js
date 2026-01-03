"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectorCalculator = void 0;
const BusinessUnitCalculator_1 = require("./BusinessUnitCalculator");
const sectors_1 = require("../constants/sectors");
/**
 * SectorCalculator - Computes aggregate supply/demand across all sectors
 *
 * Uses BusinessUnitCalculator for unified unit-type-based economics.
 * FID-20251225-001: Refactored to use BusinessUnitCalculator
 */
class SectorCalculator {
    computeCommoditySupplyDemand(unitMaps, resources) {
        const supply = {};
        const demand = {};
        const sectors = Object.keys({ ...unitMaps.production, ...unitMaps.retail, ...unitMaps.service, ...unitMaps.extraction });
        for (const res of resources) {
            supply[res] = 0;
            demand[res] = 0;
        }
        for (const sector of sectors) {
            const counts = {
                production: unitMaps.production[sector] || 0,
                retail: unitMaps.retail[sector] || 0,
                service: unitMaps.service[sector] || 0,
                extraction: unitMaps.extraction[sector] || 0,
            };
            for (const res of resources) {
                supply[res] += BusinessUnitCalculator_1.businessUnitCalculator.computeTotalCommoditySupply(sector, res, counts);
                demand[res] += BusinessUnitCalculator_1.businessUnitCalculator.computeTotalCommodityDemand(sector, res, counts);
            }
        }
        return { supply, demand };
    }
    computeProductSupplyDemand(unitMaps, products) {
        const supply = {};
        const demand = {};
        const sectors = Object.keys({ ...unitMaps.production, ...unitMaps.retail, ...unitMaps.service, ...unitMaps.extraction });
        for (const p of products) {
            supply[p] = 0;
            demand[p] = 0;
        }
        for (const sector of sectors) {
            const counts = {
                production: unitMaps.production[sector] || 0,
                retail: unitMaps.retail[sector] || 0,
                service: unitMaps.service[sector] || 0,
                extraction: unitMaps.extraction[sector] || 0,
            };
            for (const p of products) {
                // Supply: only production units create products
                const produced = sectors_1.SECTOR_PRODUCTS[sector];
                if (produced === p) {
                    supply[p] += BusinessUnitCalculator_1.businessUnitCalculator.computeProductSupplyByUnitType('production', sector, p, counts.production);
                }
                // Demand: all unit types may consume products
                demand[p] += BusinessUnitCalculator_1.businessUnitCalculator.computeTotalProductDemand(sector, p, counts);
            }
        }
        return { supply, demand };
    }
}
exports.SectorCalculator = SectorCalculator;
