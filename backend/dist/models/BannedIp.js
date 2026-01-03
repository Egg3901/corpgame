"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BannedIpModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
const normalizeIp = (ip) => {
    return (ip || '').trim().replace(/^::ffff:/, '');
};
class BannedIpModel {
    static async isIpBanned(ip) {
        const cleanIp = normalizeIp(ip);
        if (!cleanIp)
            return false;
        const result = await connection_1.default.query('SELECT 1 FROM banned_ips WHERE ip_address = $1', [cleanIp]);
        return result.rows.length > 0;
    }
    static async banIp(ip, reason, adminId) {
        const cleanIp = normalizeIp(ip);
        if (!cleanIp) {
            throw new Error('Invalid IP');
        }
        await connection_1.default.query(`INSERT INTO banned_ips (ip_address, reason, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, created_by = EXCLUDED.created_by`, [cleanIp, reason, adminId]);
    }
    static normalize(ip) {
        return normalizeIp(ip);
    }
}
exports.BannedIpModel = BannedIpModel;
