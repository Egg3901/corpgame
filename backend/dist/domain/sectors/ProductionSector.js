"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionSector = void 0;
const BaseSector_1 = require("./BaseSector");
const sectors_1 = require("../../constants/sectors");
class ProductionSector extends BaseSector_1.BaseSector {
    computeCommoditySupply(resource, counts) {
        const out = this.getNumber('EXTRACTION_OUTPUT_RATE', 2.0);
        const extractable = sectors_1.SECTOR_EXTRACTION[this.sectorName];
        if (extractable && extractable.includes(resource)) {
            return counts.extraction * out;
        }
        return 0;
    }
    computeCommodityDemand(resource, counts) {
        const consumption = this.getNumber('PRODUCTION_RESOURCE_CONSUMPTION', 0.5);
        return counts.production * consumption;
    }
    computeProductSupply(product, counts) {
        const output = this.getNumber('PRODUCTION_OUTPUT_RATE', 1.0);
        return counts.production * output;
    }
    computeProductDemand(product, counts) {
        const prodCons = this.getNumber('PRODUCTION_PRODUCT_CONSUMPTION', 0.5);
        const elecCons = this.getNumber('PRODUCTION_ELECTRICITY_CONSUMPTION', 0.5);
        const extractionElecCons = this.getNumber('EXTRACTION_ELECTRICITY_CONSUMPTION', 0.25);
        let totalDemand = 0;
        if (product === 'Electricity') {
            totalDemand += counts.production * elecCons;
            totalDemand += counts.extraction * extractionElecCons;
            return totalDemand;
        }
        const demandedProducts = sectors_1.SECTOR_PRODUCT_DEMANDS[this.sectorName];
        if (demandedProducts && demandedProducts.includes(product)) {
            totalDemand += counts.production * prodCons;
        }
        return totalDemand;
    }
}
exports.ProductionSector = ProductionSector;
