"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharePriceHistoryModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class SharePriceHistoryModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            share_price: typeof row.share_price === 'string' ? parseFloat(row.share_price) : row.share_price,
            capital: typeof row.capital === 'string' ? parseFloat(row.capital) : row.capital,
        };
    }
    static async create(historyData) {
        const { corporation_id, share_price, capital } = historyData;
        const result = await connection_1.default.query(`INSERT INTO share_price_history (corporation_id, share_price, capital)
       VALUES ($1, $2, $3)
       RETURNING *`, [corporation_id, share_price, capital]);
        return this.mapRow(result.rows[0]);
    }
    static async findByCorporationId(corporationId, limit = 100, hours) {
        let query = `SELECT * FROM share_price_history WHERE corporation_id = $1`;
        const params = [corporationId];
        if (hours) {
            query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
        }
        query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await connection_1.default.query(query, params);
        return result.rows.map(row => this.mapRow(row));
    }
}
exports.SharePriceHistoryModel = SharePriceHistoryModel;
