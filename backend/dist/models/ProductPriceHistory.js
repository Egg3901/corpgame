"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductPriceHistoryModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class ProductPriceHistoryModel {
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
        const { product_name, price, supply, demand } = historyData;
        const result = await connection_1.default.query(`INSERT INTO product_price_history (product_name, price, supply, demand)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [product_name, price, supply, demand]);
        return this.mapRow(result.rows[0]);
    }
    static async findByProductName(productName, limit = 100, hours) {
        let query = `SELECT * FROM product_price_history WHERE product_name = $1`;
        const params = [productName];
        if (hours) {
            query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
        }
        query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await connection_1.default.query(query, params);
        return result.rows.map(row => this.mapRow(row));
    }
    static async getPriceFromHoursAgo(productName, hoursAgo = 1) {
        const result = await connection_1.default.query(`SELECT price FROM product_price_history
       WHERE product_name = $1
       AND recorded_at <= NOW() - INTERVAL '${hoursAgo} hours'
       ORDER BY recorded_at DESC
       LIMIT 1`, [productName]);
        if (result.rows.length === 0)
            return null;
        const price = result.rows[0].price;
        return typeof price === 'string' ? parseFloat(price) : price;
    }
}
exports.ProductPriceHistoryModel = ProductPriceHistoryModel;
