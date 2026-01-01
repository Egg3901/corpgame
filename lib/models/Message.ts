import { getDb, getNextId } from '../db/mongo';

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  subject?: string | null;
  body: string;
  read: boolean;
  created_at: Date;
}

export interface MessageInput {
  sender_id: number;
  recipient_id: number;
  subject?: string | null;
  body: string;
}

export interface MessageWithUsers extends Message {
  sender?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
  recipient?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  };
}

export class MessageModel {
  static async create(messageData: MessageInput): Promise<Message> {
    const { sender_id, recipient_id, subject, body } = messageData;

    const id = await getNextId('messages_id');
    const doc: Message = {
      id,
      sender_id,
      recipient_id,
      subject: subject || null,
      body,
      read: false,
      created_at: new Date(),
    };

    await getDb().collection('messages').insertOne(doc);
    return doc;
  }

  static async findById(id: number): Promise<Message | null> {
    return await getDb().collection<Message>('messages').findOne({ id });
  }

  static async findByRecipientId(
    recipientId: number,
    limit: number = 50,
    offset: number = 0,
    includeRead: boolean = true
  ): Promise<MessageWithUsers[]> {
    const match: Record<string, unknown> = { recipient_id: recipientId };
    if (!includeRead) match.read = false;

    const rows = await getDb()
      .collection('messages')
      .aggregate<MessageWithUsers>([
        { $match: match },
        { $sort: { created_at: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'sender_id', foreignField: 'id', as: 'senderUser' } },
        { $unwind: { path: '$senderUser', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            sender: {
              id: '$senderUser.id',
              profile_id: '$senderUser.profile_id',
              username: '$senderUser.username',
              player_name: '$senderUser.player_name',
              profile_image_url: '$senderUser.profile_image_url',
            },
          },
        },
        { $project: { _id: 0, senderUser: 0 } },
      ])
      .toArray();

    return rows;
  }

  static async findBySenderId(
    senderId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageWithUsers[]> {
    const rows = await getDb()
      .collection('messages')
      .aggregate<MessageWithUsers>([
        { $match: { sender_id: senderId } },
        { $sort: { created_at: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'recipient_id', foreignField: 'id', as: 'recipientUser' } },
        { $unwind: { path: '$recipientUser', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            recipient: {
              id: '$recipientUser.id',
              profile_id: '$recipientUser.profile_id',
              username: '$recipientUser.username',
              player_name: '$recipientUser.player_name',
              profile_image_url: '$recipientUser.profile_image_url',
            },
          },
        },
        { $project: { _id: 0, recipientUser: 0 } },
      ])
      .toArray();

    return rows;
  }

  static async findConversation(
    userId1: number,
    userId2: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageWithUsers[]> {
    const rows = await getDb()
      .collection('messages')
      .aggregate<MessageWithUsers>([
        {
          $match: {
            $or: [
              { sender_id: userId1, recipient_id: userId2 },
              { sender_id: userId2, recipient_id: userId1 },
            ],
          },
        },
        { $sort: { created_at: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'sender_id', foreignField: 'id', as: 'senderUser' } },
        { $unwind: { path: '$senderUser', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'users', localField: 'recipient_id', foreignField: 'id', as: 'recipientUser' } },
        { $unwind: { path: '$recipientUser', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            sender: {
              id: '$senderUser.id',
              profile_id: '$senderUser.profile_id',
              username: '$senderUser.username',
              player_name: '$senderUser.player_name',
              profile_image_url: '$senderUser.profile_image_url',
            },
            recipient: {
              id: '$recipientUser.id',
              profile_id: '$recipientUser.profile_id',
              username: '$recipientUser.username',
              player_name: '$recipientUser.player_name',
              profile_image_url: '$recipientUser.profile_image_url',
            },
          },
        },
        { $project: { _id: 0, senderUser: 0, recipientUser: 0 } },
      ])
      .toArray();

    return rows;
  }

  static async markAsRead(messageId: number, userId: number): Promise<void> {
    await getDb().collection<Message>('messages').updateOne(
      { id: messageId, recipient_id: userId },
      { $set: { read: true } }
    );
  }

  static async markAllAsRead(recipientId: number, senderId?: number): Promise<void> {
    const filter: Record<string, unknown> = { recipient_id: recipientId, read: false };
    if (senderId != null) filter.sender_id = senderId;
    await getDb().collection<Message>('messages').updateMany(filter, { $set: { read: true } });
  }

  static async getUnreadCount(userId: number): Promise<number> {
    return await getDb().collection<Message>('messages').countDocuments({ recipient_id: userId, read: false });
  }

  static async delete(messageId: number, userId: number): Promise<boolean> {
    const result = await getDb().collection<Message>('messages').deleteOne({
      id: messageId,
      $or: [{ sender_id: userId }, { recipient_id: userId }],
    });
    return result.deletedCount > 0;
  }

  static async getUserConversations(userId: number): Promise<Array<{
    other_user_id: number;
    other_user: {
      id: number;
      profile_id: number;
      username: string;
      player_name?: string;
      profile_image_url?: string | null;
      last_seen_at?: Date | null;
      is_online?: boolean;
    };
    last_message: Message;
    unread_count: number;
  }>> {
    const now = new Date();
    const fiveMinutesMs = 300000;

    const rows = await getDb()
      .collection('messages')
      .aggregate<{
        other_user_id: number;
        other_user: {
          id: number;
          profile_id: number;
          username: string;
          player_name?: string;
          profile_image_url?: string | null;
          last_seen_at?: Date | null;
          is_online?: boolean;
        };
        last_message: Message;
        unread_count: number;
      }>([
        { $match: { $or: [{ sender_id: userId }, { recipient_id: userId }] } },
        {
          $addFields: {
            other_user_id: {
              $cond: [{ $eq: ['$sender_id', userId] }, '$recipient_id', '$sender_id'],
            },
          },
        },
        { $sort: { created_at: -1 } },
        { $group: { _id: '$other_user_id', last_message: { $first: '$$ROOT' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: 'id', as: 'otherUser' } },
        { $unwind: { path: '$otherUser', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'messages',
            let: { otherId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$recipient_id', userId] },
                      { $eq: ['$sender_id', '$$otherId'] },
                      { $eq: ['$read', false] },
                    ],
                  },
                },
              },
              { $count: 'count' },
            ],
            as: 'unreadCount',
          },
        },
        {
          $addFields: {
            unread_count: { $ifNull: [{ $arrayElemAt: ['$unreadCount.count', 0] }, 0] },
            other_user: {
              id: '$otherUser.id',
              profile_id: '$otherUser.profile_id',
              username: '$otherUser.username',
              player_name: '$otherUser.player_name',
              profile_image_url: '$otherUser.profile_image_url',
              last_seen_at: '$otherUser.last_seen_at',
              is_online: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$otherUser.last_seen_at', null] },
                      {
                        $lt: [
                          { $subtract: [now, '$otherUser.last_seen_at'] },
                          fiveMinutesMs,
                        ],
                      },
                    ],
                  },
                  true,
                  false,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            other_user_id: '$_id',
            other_user: 1,
            last_message: {
              id: '$last_message.id',
              sender_id: '$last_message.sender_id',
              recipient_id: '$last_message.recipient_id',
              subject: '$last_message.subject',
              body: '$last_message.body',
              read: '$last_message.read',
              created_at: '$last_message.created_at',
            },
            unread_count: 1,
          },
        },
        { $sort: { 'last_message.created_at': -1 } },
      ])
      .toArray();

    return rows.map((row: {
      other_user_id: number;
      other_user: {
        id: number;
        profile_id: number;
        username: string;
        player_name?: string;
        profile_image_url?: string | null;
      };
      last_message: Message;
      unread_count: number;
    }) => ({
      other_user_id: row.other_user_id,
      other_user: row.other_user,
      last_message: row.last_message,
      unread_count: row.unread_count,
    }));
  }
}
