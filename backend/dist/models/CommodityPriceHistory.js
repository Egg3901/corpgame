"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommodityPriceHistoryModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class CommodityPriceHistoryModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
            supply: typeof row.supply === 'string' ? parseFloat(row.supply) : row.supply,
            demand: typeof row.demand === 'string' ? parseFloat(row.demand) : row.demand,
        };
    }
    static async create(historyData) {
        const { resource_name, price, supply, demand } = historyData;
        const result = await connection_1.default.query(`INSERT INTO commodity_price_history (resource_name, price, supply, demand)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [resource_name, price, supply, demand]);
        return this.mapRow(result.rows[0]);
    }
    static async findByResourceName(resourceName, limit = 100, hours) {
        let query = `SELECT * FROM commodity_price_history WHERE resource_name = $1`;
        const params = [resourceName];
        if (hours) {
            query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
        }
        query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await connection_1.default.query(query, params);
        return result.rows.map(row => this.mapRow(row));
    }
    static async getPriceFromHoursAgo(resourceName, hoursAgo = 1) {
        const result = await connection_1.default.query(`SELECT price FROM commodity_price_history
       WHERE resource_name = $1
       AND recorded_at <= NOW() - INTERVAL '${hoursAgo} hours'
       ORDER BY recorded_at DESC
       LIMIT 1`, [resourceName]);
        if (result.rows.length === 0)
            return null;
        const price = result.rows[0].price;
        return typeof price === 'string' ? parseFloat(price) : price;
    }
}
exports.CommodityPriceHistoryModel = CommodityPriceHistoryModel;
