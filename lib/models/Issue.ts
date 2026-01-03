import { getDb, getNextId } from '../db/mongo';

export interface Issue {
  id: number;
  user_id: number;
  type: string;
  description: string;
  status: 'open' | 'resolved';
  created_at: Date;
}

export class IssueModel {
  static async create(userId: number, type: string, description: string): Promise<Issue> {
    const id = await getNextId('issues_id');
    const doc: Issue = {
      id,
      user_id: userId,
      type,
      description,
      status: 'open',
      created_at: new Date(),
    };
    await getDb().collection<Issue>('issues').insertOne(doc);
    return doc;
  }

  static async findAll(): Promise<Issue[]> {
    return await getDb().collection<Issue>('issues').find().sort({ created_at: -1 }).toArray();
  }
}
