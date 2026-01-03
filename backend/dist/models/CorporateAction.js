"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorporateActionModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class CorporateActionModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            cost: typeof row.cost === 'string' ? parseFloat(row.cost) : row.cost,
        };
    }
    static async create(actionData) {
        const { corporation_id, action_type, cost, started_at = new Date(), expires_at, } = actionData;
        const result = await connection_1.default.query(`INSERT INTO corporate_actions (corporation_id, action_type, cost, started_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [corporation_id, action_type, cost, started_at, expires_at]);
        return this.mapRow(result.rows[0]);
    }
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM corporate_actions WHERE id = $1', [id]);
        return this.mapRow(result.rows[0]) || null;
    }
    static async findByCorporationId(corporationId) {
        const result = await connection_1.default.query('SELECT * FROM corporate_actions WHERE corporation_id = $1 ORDER BY created_at DESC', [corporationId]);
        return result.rows.map(row => this.mapRow(row));
    }
    // Get active action for a corporation of a specific type
    static async findActiveAction(corporationId, actionType) {
        const result = await connection_1.default.query(`SELECT * FROM corporate_actions 
       WHERE corporation_id = $1 
       AND action_type = $2 
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`, [corporationId, actionType]);
        return this.mapRow(result.rows[0]) || null;
    }
    // Get all active actions for a corporation
    static async findAllActiveActions(corporationId) {
        const result = await connection_1.default.query(`SELECT * FROM corporate_actions 
       WHERE corporation_id = $1 
       AND expires_at > NOW()
       ORDER BY expires_at DESC`, [corporationId]);
        return result.rows.map(row => this.mapRow(row));
    }
    // Check if a corporation has an active action of a specific type
    static async hasActiveAction(corporationId, actionType) {
        const action = await this.findActiveAction(corporationId, actionType);
        return action !== null;
    }
    // Get all expired actions (for cleanup)
    static async findExpiredActions() {
        const result = await connection_1.default.query('SELECT * FROM corporate_actions WHERE expires_at <= NOW() ORDER BY expires_at ASC');
        return result.rows.map(row => this.mapRow(row));
    }
    static async delete(id) {
        await connection_1.default.query('DELETE FROM corporate_actions WHERE id = $1', [id]);
    }
    // Delete all expired actions (for cleanup)
    static async deleteExpiredActions() {
        const result = await connection_1.default.query('DELETE FROM corporate_actions WHERE expires_at <= NOW()');
        return result.rowCount || 0;
    }
}
exports.CorporateActionModel = CorporateActionModel;
