"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetailServiceSector = void 0;
const BaseSector_1 = require("./BaseSector");
const sectors_1 = require("../../constants/sectors");
class RetailServiceSector extends BaseSector_1.BaseSector {
    computeCommoditySupply(resource, counts) {
        return 0;
    }
    computeCommodityDemand(resource, counts) {
        return 0;
    }
    computeProductSupply(product, counts) {
        return 0;
    }
    computeProductDemand(product, counts) {
        let retailCons = this.getNumber('RETAIL_PRODUCT_CONSUMPTION', 2.0);
        const serviceElec = this.getNumber('SERVICE_ELECTRICITY_CONSUMPTION', 0.25);
        let serviceProd = this.getNumber('SERVICE_PRODUCT_CONSUMPTION', 1.5);
        // Defense sector rule: 1.0 consumption per unit
        if (this.sectorName === 'Defense') {
            retailCons = 1.0;
            serviceProd = 1.0;
        }
        // Note: Light Industry is production-only and cannot build service units
        let total = 0;
        const retailDemands = sectors_1.SECTOR_RETAIL_DEMANDS[this.sectorName];
        const serviceDemands = sectors_1.SECTOR_SERVICE_DEMANDS[this.sectorName];
        if (retailDemands && retailDemands.includes(product)) {
            total += counts.retail * retailCons;
        }
        if (product === 'Electricity') {
            total += counts.service * serviceElec;
        }
        else if (serviceDemands && serviceDemands.includes(product)) {
            total += counts.service * serviceProd;
        }
        return total;
    }
}
exports.RetailServiceSector = RetailServiceSector;
