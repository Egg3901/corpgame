import { getDb } from '../db/mongo';

export interface GameSetting {
  key: string;
  value: unknown;
  updated_at: Date;
}

const COLLECTION_NAME = 'game_settings';

export const GameSettingsModel = {
  async get<T>(key: string): Promise<T | null> {
    const db = getDb();
    const setting = await db.collection<GameSetting>(COLLECTION_NAME).findOne({ key });
    return setting ? (setting.value as T) : null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    const db = getDb();
    await db.collection<GameSetting>(COLLECTION_NAME).updateOne(
      { key },
      { $set: { key, value, updated_at: new Date() } },
      { upsert: true }
    );
  },

  async isCronEnabled(): Promise<boolean> {
    const enabled = await this.get<boolean>('cron_enabled');
    return enabled !== false; // Default to true if not set
  },

  async setCronEnabled(enabled: boolean): Promise<void> {
    await this.set('cron_enabled', enabled);
  },
};
