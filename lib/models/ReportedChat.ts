import { getDb, getNextId } from '../db/mongo';
import { Document } from 'mongodb';

export interface ReportedChat {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason?: string | null;
  reviewed: boolean;
  reviewed_by?: number | null;
  reviewed_at?: Date | null;
  created_at: Date;
}

export interface ReportedChatInput {
  reporter_id: number;
  reported_user_id: number;
  reason?: string | null;
}

export interface ReportedChatWithUsers extends ReportedChat {
  reporter?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  reported_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  reviewed_by_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
  } | null;
}

export class ReportedChatModel {
  static async create(reportData: ReportedChatInput): Promise<ReportedChat> {
    const { reporter_id, reported_user_id, reason } = reportData;
    
    const id = await getNextId('reported_chats_id');
    const now = new Date();

    const doc: ReportedChat = {
      id,
      reporter_id,
      reported_user_id,
      reason: reason || null,
      reviewed: false,
      reviewed_by: null,
      reviewed_at: null,
      created_at: now,
    };
    
    await getDb().collection<ReportedChat>('reported_chats').insertOne(doc);
    return doc;
  }

  static async resolve(id: number, reviewerId: number): Promise<boolean> {
    const result = await getDb().collection<ReportedChat>('reported_chats').updateOne(
      { id },
      { 
        $set: { 
          reviewed: true, 
          reviewed_by: reviewerId, 
          reviewed_at: new Date() 
        } 
      }
    );
    return result.modifiedCount > 0;
  }

  static async findById(id: number): Promise<ReportedChat | null> {
    return await getDb().collection<ReportedChat>('reported_chats').findOne({ id });
  }

  static async findAll(includeReviewed: boolean = false): Promise<ReportedChatWithUsers[]> {
    const pipeline: Document[] = [];

    // Filter reviewed
    if (!includeReviewed) {
      pipeline.push({ $match: { reviewed: false } });
    }

    // Lookup reporter
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'reporter_id',
          foreignField: 'id',
          as: 'reporter_docs'
        }
      },
      {
        $unwind: { path: '$reporter_docs', preserveNullAndEmptyArrays: true }
      }
    );

    // Lookup reported user
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'reported_user_id',
          foreignField: 'id',
          as: 'reported_user_docs'
        }
      },
      {
        $unwind: { path: '$reported_user_docs', preserveNullAndEmptyArrays: true }
      }
    );

    // Lookup reviewer
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'reviewed_by',
          foreignField: 'id',
          as: 'reviewer_docs'
        }
      },
      {
        $unwind: { path: '$reviewer_docs', preserveNullAndEmptyArrays: true }
      }
    );

    // Project fields
    pipeline.push({
      $project: {
        id: 1,
        reporter_id: 1,
        reported_user_id: 1,
        reason: 1,
        reviewed: 1,
        reviewed_by: 1,
        reviewed_at: 1,
        created_at: 1,
        reporter: {
          $cond: {
            if: '$reporter_docs',
            then: {
              id: '$reporter_docs.id',
              profile_id: '$reporter_docs.profile_id',
              username: '$reporter_docs.username',
              player_name: '$reporter_docs.player_name',
              profile_image_url: '$reporter_docs.profile_image_url'
            },
            else: null
          }
        },
        reported_user: {
          $cond: {
            if: '$reported_user_docs',
            then: {
              id: '$reported_user_docs.id',
              profile_id: '$reported_user_docs.profile_id',
              username: '$reported_user_docs.username',
              player_name: '$reported_user_docs.player_name',
              profile_image_url: '$reported_user_docs.profile_image_url'
            },
            else: null
          }
        },
        reviewed_by_user: {
          $cond: {
            if: '$reviewer_docs',
            then: {
              id: '$reviewer_docs.id',
              profile_id: '$reviewer_docs.profile_id',
              username: '$reviewer_docs.username',
              player_name: '$reviewer_docs.player_name'
            },
            else: null
          }
        }
      }
    });

    // Sort
    pipeline.push({ $sort: { created_at: -1 } });

    return await getDb().collection<ReportedChat>('reported_chats').aggregate(pipeline).toArray() as ReportedChatWithUsers[];
  }
}
