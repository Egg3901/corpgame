import { getDb } from '../db/mongo';
import { ObjectId } from 'mongodb';

export interface AuditLog {
  _id?: ObjectId;
  action: string;
  actor_id?: number | string; // ID of user performing action, or 'system'/'script'
  actor_ip?: string;
  target_id?: number | string; // ID of affected entity
  target_type: string; // 'user', 'corporation', 'system', etc.
  details?: Record<string, unknown>;
  created_at: Date;
}

export class AuditLogModel {
  static async log(entry: Omit<AuditLog, 'created_at'>): Promise<void> {
    const db = getDb();
    await db.collection('audit_logs').insertOne({
      ...entry,
      created_at: new Date(),
    });
  }

  static async getRecent(limit: number = 50): Promise<AuditLog[]> {
    const db = getDb();
    return await db.collection<AuditLog>('audit_logs')
      .find()
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }
}
