import { getDb } from '../db/mongo';

const normalizeIp = (ip: string): string => {
  return (ip || '').trim().replace(/^::ffff:/, '');
};

export class BannedIpModel {
  static async isIpBanned(ip: string): Promise<boolean> {
    const cleanIp = normalizeIp(ip);
    if (!cleanIp) return false;
    const existing = await getDb().collection('banned_ips').findOne({ ip_address: cleanIp }, { projection: { ip_address: 1 } });
    return !!existing;
  }

  static async banIp(ip: string, reason: string | null, adminId: number | null): Promise<void> {
    const cleanIp = normalizeIp(ip);
    if (!cleanIp) {
      throw new Error('Invalid IP');
    }
    await getDb().collection('banned_ips').updateOne(
      { ip_address: cleanIp },
      {
        $set: { ip_address: cleanIp, reason: reason ?? null, created_by: adminId ?? null },
        $setOnInsert: { created_at: new Date() },
      },
      { upsert: true }
    );
  }

  static normalize(ip: string): string {
    return normalizeIp(ip);
  }
}
