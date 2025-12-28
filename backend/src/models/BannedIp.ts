import pool from '../db/connection';

const normalizeIp = (ip: string): string => {
  return (ip || '').trim().replace(/^::ffff:/, '');
};

export class BannedIpModel {
  static async isIpBanned(ip: string): Promise<boolean> {
    const cleanIp = normalizeIp(ip);
    if (!cleanIp) return false;
    const result = await pool.query('SELECT 1 FROM banned_ips WHERE ip_address = $1', [cleanIp]);
    return result.rows.length > 0;
  }

  static async banIp(ip: string, reason: string | null, adminId: number | null): Promise<void> {
    const cleanIp = normalizeIp(ip);
    if (!cleanIp) {
      throw new Error('Invalid IP');
    }
    await pool.query(
      `INSERT INTO banned_ips (ip_address, reason, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip_address) DO UPDATE SET reason = EXCLUDED.reason, created_by = EXCLUDED.created_by`,
      [cleanIp, reason, adminId]
    );
  }

  static normalize(ip: string): string {
    return normalizeIp(ip);
  }
}
