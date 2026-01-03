"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessUnitModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class BusinessUnitModel {
    static async create(data) {
        const { market_entry_id, unit_type, count = 1 } = data;
        const result = await connection_1.default.query(`INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       RETURNING *`, [market_entry_id, unit_type, count]);
        return result.rows[0];
    }
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM business_units WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByMarketEntryId(marketEntryId) {
        const result = await connection_1.default.query('SELECT * FROM business_units WHERE market_entry_id = $1 ORDER BY unit_type', [marketEntryId]);
        return result.rows;
    }
    static async findByMarketEntryAndType(marketEntryId, unitType) {
        const result = await connection_1.default.query('SELECT * FROM business_units WHERE market_entry_id = $1 AND unit_type = $2', [marketEntryId, unitType]);
        return result.rows[0] || null;
    }
    // Increment unit count or create if doesn't exist
    static async incrementUnit(marketEntryId, unitType, incrementBy = 1) {
        // Use upsert to either create or increment
        const result = await connection_1.default.query(`INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       ON CONFLICT (market_entry_id, unit_type)
       DO UPDATE SET 
         count = business_units.count + $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [marketEntryId, unitType, incrementBy]);
        return result.rows[0];
    }
    // Set unit count directly
    static async setUnitCount(marketEntryId, unitType, count) {
        const result = await connection_1.default.query(`INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       ON CONFLICT (market_entry_id, unit_type)
       DO UPDATE SET 
         count = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [marketEntryId, unitType, count]);
        return result.rows[0];
    }
    // Decrement unit count (remove units)
    static async removeUnit(marketEntryId, unitType, decrementBy = 1) {
        const result = await connection_1.default.query(`UPDATE business_units
       SET count = GREATEST(0, count - $3),
           updated_at = CURRENT_TIMESTAMP
       WHERE market_entry_id = $1 AND unit_type = $2
       RETURNING *`, [marketEntryId, unitType, decrementBy]);
        if (result.rows.length === 0) {
            return null;
        }
        // If count is now 0, delete the row
        if (result.rows[0].count === 0) {
            await connection_1.default.query('DELETE FROM business_units WHERE market_entry_id = $1 AND unit_type = $2', [marketEntryId, unitType]);
        }
        return result.rows[0];
    }
    // Get total unit counts for a market entry
    static async getUnitCounts(marketEntryId) {
        const units = await this.findByMarketEntryId(marketEntryId);
        return {
            retail: units.find(u => u.unit_type === 'retail')?.count || 0,
            production: units.find(u => u.unit_type === 'production')?.count || 0,
            service: units.find(u => u.unit_type === 'service')?.count || 0,
            extraction: units.find(u => u.unit_type === 'extraction')?.count || 0,
        };
    }
    // Bulk get unit counts for multiple market entries - avoids N+1 queries
    static async getBulkUnitCounts(marketEntryIds) {
        if (marketEntryIds.length === 0) {
            return new Map();
        }
        const result = await connection_1.default.query(`SELECT market_entry_id, unit_type, count 
       FROM business_units 
       WHERE market_entry_id = ANY($1)`, [marketEntryIds]);
        // Initialize map with default values
        const countsMap = new Map();
        for (const id of marketEntryIds) {
            countsMap.set(id, { retail: 0, production: 0, service: 0, extraction: 0 });
        }
        // Fill in actual values
        for (const row of result.rows) {
            const counts = countsMap.get(row.market_entry_id);
            if (counts) {
                counts[row.unit_type] = row.count;
            }
        }
        return countsMap;
    }
    static async delete(id) {
        await connection_1.default.query('DELETE FROM business_units WHERE id = $1', [id]);
    }
    static async deleteByMarketEntryId(marketEntryId) {
        await connection_1.default.query('DELETE FROM business_units WHERE market_entry_id = $1', [marketEntryId]);
    }
}
exports.BusinessUnitModel = BusinessUnitModel;
