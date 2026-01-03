"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShareTransactionModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class ShareTransactionModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            shares: typeof row.shares === 'string' ? parseInt(row.shares, 10) : row.shares,
            price_per_share: typeof row.price_per_share === 'string' ? parseFloat(row.price_per_share) : row.price_per_share,
            total_amount: typeof row.total_amount === 'string' ? parseFloat(row.total_amount) : row.total_amount,
        };
    }
    static async create(transactionData) {
        const { corporation_id, user_id, transaction_type, shares, price_per_share, total_amount } = transactionData;
        const result = await connection_1.default.query(`INSERT INTO share_transactions (corporation_id, user_id, transaction_type, shares, price_per_share, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [corporation_id, user_id, transaction_type, shares, price_per_share, total_amount]);
        return this.mapRow(result.rows[0]);
    }
    static async findByCorporationId(corporationId, limit = 50) {
        const result = await connection_1.default.query(`SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`, [corporationId, limit]);
        return result.rows.map(row => this.mapRow(row));
    }
    static async findByUserId(userId, limit = 50) {
        const result = await connection_1.default.query(`SELECT * FROM share_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`, [userId, limit]);
        return result.rows.map(row => this.mapRow(row));
    }
    static async getRecentActivity(corporationId, hours = 24) {
        const result = await connection_1.default.query(`SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       AND created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY created_at DESC`, [corporationId]);
        return result.rows.map(row => this.mapRow(row));
    }
}
exports.ShareTransactionModel = ShareTransactionModel;
