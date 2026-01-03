"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CorporationModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
const sectors_1 = require("../constants/sectors");
class CorporationModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            share_price: typeof row.share_price === 'string' ? parseFloat(row.share_price) : row.share_price,
            capital: typeof row.capital === 'string' ? parseFloat(row.capital) : row.capital,
            ceo_salary: typeof row.ceo_salary === 'string' ? parseFloat(row.ceo_salary) : row.ceo_salary,
            dividend_percentage: typeof row.dividend_percentage === 'string' ? parseFloat(row.dividend_percentage) : row.dividend_percentage,
            special_dividend_last_amount: typeof row.special_dividend_last_amount === 'string' ? parseFloat(row.special_dividend_last_amount) : row.special_dividend_last_amount,
        };
    }
    static async create(corpData) {
        const { ceo_id, name, logo = null, shares = 500000, public_shares = 100000, share_price = 1.00, capital = 500000.00, type = null, focus = 'diversified', } = corpData;
        // Validate sector if provided
        if (type !== null && !(0, sectors_1.isValidSector)(type)) {
            throw new Error(`Invalid sector: ${type}. Must be one of the predefined sectors.`);
        }
        // Validate focus
        if (!(0, sectors_1.isValidCorpFocus)(focus)) {
            throw new Error(`Invalid focus: ${focus}. Must be one of: extraction, production, retail, service, diversified.`);
        }
        const result = await connection_1.default.query(`INSERT INTO corporations (ceo_id, name, logo, shares, public_shares, share_price, capital, type, focus)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [ceo_id, name.trim(), logo, shares, public_shares, share_price, capital, type, focus]);
        return this.mapRow(result.rows[0]);
    }
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM corporations WHERE id = $1', [id]);
        return this.mapRow(result.rows[0]) || null;
    }
    static async findAll() {
        const result = await connection_1.default.query('SELECT * FROM corporations ORDER BY created_at DESC');
        return result.rows.map(row => this.mapRow(row));
    }
    static async findByCeoId(ceoId) {
        const result = await connection_1.default.query('SELECT * FROM corporations WHERE ceo_id = $1 ORDER BY created_at DESC', [ceoId]);
        return result.rows.map(row => this.mapRow(row));
    }
    static async update(id, updates) {
        // Validate sector if being updated
        if (updates.type !== undefined && updates.type !== null && !(0, sectors_1.isValidSector)(updates.type)) {
            throw new Error(`Invalid sector: ${updates.type}. Must be one of the predefined sectors.`);
        }
        // Validate focus if being updated
        if (updates.focus !== undefined && !(0, sectors_1.isValidCorpFocus)(updates.focus)) {
            throw new Error(`Invalid focus: ${updates.focus}. Must be one of: extraction, production, retail, service, diversified.`);
        }
        const allowedFields = [
            'name', 'logo', 'type', 'share_price', 'capital', 'public_shares', 'shares',
            'hq_state', 'board_size', 'elected_ceo_id', 'ceo_salary', 'dividend_percentage',
            'special_dividend_last_paid_at', 'special_dividend_last_amount', 'focus'
        ];
        const fields = [];
        const values = [];
        let paramIndex = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const result = await connection_1.default.query(`UPDATE corporations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        return this.mapRow(result.rows[0]) || null;
    }
    static async delete(id) {
        await connection_1.default.query('DELETE FROM corporations WHERE id = $1', [id]);
    }
    // Clear the elected CEO (for resignation)
    static async clearElectedCeo(id) {
        const result = await connection_1.default.query(`UPDATE corporations SET elected_ceo_id = NULL WHERE id = $1 RETURNING *`, [id]);
        return this.mapRow(result.rows[0]) || null;
    }
    // Set elected CEO
    static async setElectedCeo(id, ceoUserId) {
        const result = await connection_1.default.query(`UPDATE corporations SET elected_ceo_id = $1 WHERE id = $2 RETURNING *`, [ceoUserId, id]);
        return this.mapRow(result.rows[0]) || null;
    }
}
exports.CorporationModel = CorporationModel;
