"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class TransactionModel {
    static mapRow(row) {
        if (!row)
            return row;
        return {
            ...row,
            amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
        };
    }
    static mapRowWithDetails(row) {
        if (!row)
            return row;
        return {
            ...row,
            amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
        };
    }
    /**
     * Create a new transaction record
     */
    static async create(data) {
        const { transaction_type, amount, from_user_id = null, to_user_id = null, corporation_id = null, description = null, reference_id = null, reference_type = null, } = data;
        const result = await connection_1.default.query(`INSERT INTO transactions (
        transaction_type, amount, from_user_id, to_user_id, 
        corporation_id, description, reference_id, reference_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`, [
            transaction_type,
            amount,
            from_user_id,
            to_user_id,
            corporation_id,
            description,
            reference_id,
            reference_type,
        ]);
        return this.mapRow(result.rows[0]);
    }
    /**
     * Find transaction by ID
     */
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM transactions WHERE id = $1', [id]);
        return this.mapRow(result.rows[0]) || null;
    }
    /**
     * Get transactions for a user (as sender or recipient)
     */
    static async findByUserId(userId, limit = 50, offset = 0) {
        const result = await connection_1.default.query(`SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        CASE WHEN t.corporation_id IS NOT NULL THEN
          json_build_object(
            'id', c.id,
            'name', c.name,
            'logo', c.logo
          )
        ELSE NULL END as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      WHERE t.from_user_id = $1 OR t.to_user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return result.rows.map(row => this.mapRowWithDetails(row));
    }
    /**
     * Get transactions for a corporation
     */
    static async findByCorporationId(corporationId, limit = 50, offset = 0) {
        const result = await connection_1.default.query(`SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'logo', c.logo
        ) as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      JOIN corporations c ON t.corporation_id = c.id
      WHERE t.corporation_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`, [corporationId, limit, offset]);
        return result.rows.map(row => this.mapRowWithDetails(row));
    }
    /**
     * Admin: Get all transactions with filters
     */
    static async findAll(filters = {}, limit = 50, offset = 0) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (filters.user_id) {
            conditions.push(`(t.from_user_id = $${paramIndex} OR t.to_user_id = $${paramIndex})`);
            params.push(filters.user_id);
            paramIndex++;
        }
        if (filters.corporation_id) {
            conditions.push(`t.corporation_id = $${paramIndex}`);
            params.push(filters.corporation_id);
            paramIndex++;
        }
        if (filters.transaction_type) {
            conditions.push(`t.transaction_type = $${paramIndex}`);
            params.push(filters.transaction_type);
            paramIndex++;
        }
        if (filters.search) {
            conditions.push(`(
        t.description ILIKE $${paramIndex}
        OR fu.username ILIKE $${paramIndex}
        OR fu.player_name ILIKE $${paramIndex}
        OR tu.username ILIKE $${paramIndex}
        OR tu.player_name ILIKE $${paramIndex}
        OR c.name ILIKE $${paramIndex}
      )`);
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        if (filters.from_date) {
            conditions.push(`t.created_at >= $${paramIndex}`);
            params.push(filters.from_date);
            paramIndex++;
        }
        if (filters.to_date) {
            conditions.push(`t.created_at <= $${paramIndex}`);
            params.push(filters.to_date);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        params.push(limit, offset);
        const result = await connection_1.default.query(`SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        CASE WHEN t.corporation_id IS NOT NULL THEN
          json_build_object(
            'id', c.id,
            'name', c.name,
            'logo', c.logo
          )
        ELSE NULL END as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, params);
        return result.rows.map(row => this.mapRowWithDetails(row));
    }
    /**
     * Get count of transactions matching filters (for pagination)
     */
    static async getCount(filters = {}) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;
        if (filters.user_id) {
            conditions.push(`(t.from_user_id = $${paramIndex} OR t.to_user_id = $${paramIndex})`);
            params.push(filters.user_id);
            paramIndex++;
        }
        if (filters.corporation_id) {
            conditions.push(`t.corporation_id = $${paramIndex}`);
            params.push(filters.corporation_id);
            paramIndex++;
        }
        if (filters.transaction_type) {
            conditions.push(`t.transaction_type = $${paramIndex}`);
            params.push(filters.transaction_type);
            paramIndex++;
        }
        if (filters.search) {
            conditions.push(`(
        t.description ILIKE $${paramIndex}
        OR fu.username ILIKE $${paramIndex}
        OR fu.player_name ILIKE $${paramIndex}
        OR tu.username ILIKE $${paramIndex}
        OR tu.player_name ILIKE $${paramIndex}
        OR c.name ILIKE $${paramIndex}
      )`);
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        if (filters.from_date) {
            conditions.push(`t.created_at >= $${paramIndex}`);
            params.push(filters.from_date);
            paramIndex++;
        }
        if (filters.to_date) {
            conditions.push(`t.created_at <= $${paramIndex}`);
            params.push(filters.to_date);
            paramIndex++;
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await connection_1.default.query(`SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      ${whereClause}`, params);
        return parseInt(result.rows[0].count, 10);
    }
    /**
     * Get recent transactions (for dashboard/overview)
     */
    static async getRecent(limit = 10) {
        return this.findAll({}, limit, 0);
    }
}
exports.TransactionModel = TransactionModel;
