"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareholderModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class ShareholderModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            shares: typeof row.shares === 'string' ? parseInt(row.shares, 10) : row.shares,
        };
    }
    static async create(shareholderData) {
        const { corporation_id, user_id, shares } = shareholderData;
        const result = await connection_1.default.query(`INSERT INTO shareholders (corporation_id, user_id, shares)
       VALUES ($1, $2, $3)
       ON CONFLICT (corporation_id, user_id) 
       DO UPDATE SET shares = shareholders.shares + EXCLUDED.shares
       RETURNING *`, [corporation_id, user_id, shares]);
        return this.mapRow(result.rows[0]);
    }
    static async findByCorporationId(corporationId) {
        const result = await connection_1.default.query('SELECT * FROM shareholders WHERE corporation_id = $1 ORDER BY shares DESC', [corporationId]);
        return result.rows.map(row => this.mapRow(row));
    }
    static async findByUserId(userId) {
        const result = await connection_1.default.query('SELECT * FROM shareholders WHERE user_id = $1 ORDER BY purchased_at DESC', [userId]);
        return result.rows.map(row => this.mapRow(row));
    }
    static async updateShares(corporationId, userId, shares) {
        const result = await connection_1.default.query(`UPDATE shareholders SET shares = $1 
       WHERE corporation_id = $2 AND user_id = $3 
       RETURNING *`, [shares, corporationId, userId]);
        return this.mapRow(result.rows[0]) || null;
    }
    static async delete(corporationId, userId) {
        await connection_1.default.query('DELETE FROM shareholders WHERE corporation_id = $1 AND user_id = $2', [corporationId, userId]);
    }
}
exports.ShareholderModel = ShareholderModel;
