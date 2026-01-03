"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseSector = void 0;
class BaseSector {
    constructor(sectorName, params) {
        this.sectorName = sectorName;
        this.params = params;
    }
    getCategory() {
        return this.params.sectorOverrides[this.sectorName]?.category || 'production';
    }
    getNumber(key, fallback) {
        const category = this.getCategory();
        const catVal = this.params.categoryParams[category]?.[key];
        const ov = this.params.sectorOverrides[this.sectorName]?.overrides?.[key];
        return typeof ov === 'number' ? ov : typeof catVal === 'number' ? catVal : fallback;
    }
}
exports.BaseSector = BaseSector;
