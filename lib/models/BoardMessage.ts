import { getDb, getNextId } from '../db/mongo';

export interface BoardMessage {
  id: number;
  corporation_id: number;
  user_id: number;
  message: string;
  created_at: Date;
}

export interface BoardMessageWithUser extends BoardMessage {
  user?: {
    id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
}

export class BoardMessageModel {
  static async create(corporationId: number, userId: number, message: string): Promise<BoardMessage> {
    const id = await getNextId('board_messages_id');
    const doc: BoardMessage = {
      id,
      corporation_id: corporationId,
      user_id: userId,
      message,
      created_at: new Date(),
    };

    await getDb().collection('board_messages').insertOne(doc);
    return doc;
  }

  static async findByCorporationId(
    corporationId: number, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<BoardMessageWithUser[]> {
    return await getDb()
      .collection('board_messages')
      .aggregate<BoardMessageWithUser>([
        { $match: { corporation_id: corporationId } },
        { $sort: { created_at: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'user_id', foreignField: 'id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: 1,
            corporation_id: 1,
            user_id: 1,
            message: 1,
            created_at: 1,
            user: {
              id: 1,
              username: 1,
              player_name: 1,
              profile_image_url: 1
            }
          }
        }
      ])
      .toArray();
  }

  static async findById(id: number): Promise<BoardMessage | null> {
    return await getDb().collection<BoardMessage>('board_messages').findOne({ id });
  }

  static async delete(id: number): Promise<void> {
    await getDb().collection('board_messages').deleteOne({ id });
  }
}
