"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
class MessageModel {
    static async create(messageData) {
        const { sender_id, recipient_id, subject, body } = messageData;
        const result = await connection_1.default.query(`INSERT INTO messages (sender_id, recipient_id, subject, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, recipient_id, subject, body, read, created_at`, [sender_id, recipient_id, subject || null, body]);
        return result.rows[0];
    }
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM messages WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByRecipientId(recipientId, limit = 50, offset = 0, includeRead = true) {
        let query = `
      SELECT 
        m.*,
        json_build_object(
          'id', s.id,
          'profile_id', s.profile_id,
          'username', s.username,
          'player_name', s.player_name,
          'profile_image_url', s.profile_image_url
        ) as sender
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      WHERE m.recipient_id = $1
    `;
        const params = [recipientId];
        if (!includeRead) {
            query += ' AND m.read = false';
        }
        query += ' ORDER BY m.created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);
        const result = await connection_1.default.query(query, params);
        return result.rows;
    }
    static async findBySenderId(senderId, limit = 50, offset = 0) {
        const result = await connection_1.default.query(`SELECT 
        m.*,
        json_build_object(
          'id', r.id,
          'profile_id', r.profile_id,
          'username', r.username,
          'player_name', r.player_name,
          'profile_image_url', r.profile_image_url
        ) as recipient
      FROM messages m
      JOIN users r ON m.recipient_id = r.id
      WHERE m.sender_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3`, [senderId, limit, offset]);
        return result.rows;
    }
    static async findConversation(userId1, userId2, limit = 50, offset = 0) {
        const result = await connection_1.default.query(`SELECT 
        m.*,
        json_build_object(
          'id', s.id,
          'profile_id', s.profile_id,
          'username', s.username,
          'player_name', s.player_name,
          'profile_image_url', s.profile_image_url
        ) as sender,
        json_build_object(
          'id', r.id,
          'profile_id', r.profile_id,
          'username', r.username,
          'player_name', r.player_name,
          'profile_image_url', r.profile_image_url
        ) as recipient
      FROM messages m
      JOIN users s ON m.sender_id = s.id
      JOIN users r ON m.recipient_id = r.id
      WHERE (m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4`, [userId1, userId2, limit, offset]);
        return result.rows;
    }
    static async markAsRead(messageId, userId) {
        await connection_1.default.query(`UPDATE messages 
       SET read = true 
       WHERE id = $1 AND recipient_id = $2`, [messageId, userId]);
    }
    static async markAllAsRead(recipientId, senderId) {
        if (senderId) {
            await connection_1.default.query(`UPDATE messages 
         SET read = true 
         WHERE recipient_id = $1 AND sender_id = $2 AND read = false`, [recipientId, senderId]);
        }
        else {
            await connection_1.default.query(`UPDATE messages 
         SET read = true 
         WHERE recipient_id = $1 AND read = false`, [recipientId]);
        }
    }
    static async getUnreadCount(userId) {
        const result = await connection_1.default.query('SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND read = false', [userId]);
        return parseInt(result.rows[0].count, 10);
    }
    static async delete(messageId, userId) {
        // Only allow deletion if user is sender or recipient
        const result = await connection_1.default.query(`DELETE FROM messages 
       WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)
       RETURNING id`, [messageId, userId]);
        return result.rows.length > 0;
    }
    static async getUserConversations(userId) {
        const result = await connection_1.default.query(`WITH conversation_partners AS (
        SELECT DISTINCT
          CASE 
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END as other_user_id
        FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
      ),
      last_messages AS (
        SELECT DISTINCT ON (other_user_id)
          m.*,
          cp.other_user_id
        FROM conversation_partners cp
        CROSS JOIN LATERAL (
          SELECT *
          FROM messages
          WHERE (sender_id = $1 AND recipient_id = cp.other_user_id)
             OR (sender_id = cp.other_user_id AND recipient_id = $1)
          ORDER BY created_at DESC
          LIMIT 1
        ) m
      ),
      unread_counts AS (
        SELECT 
          CASE 
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END as other_user_id,
          COUNT(*) as unread_count
        FROM messages
        WHERE recipient_id = $1 AND read = false
        GROUP BY other_user_id
      )
      SELECT 
        lm.other_user_id,
        json_build_object(
          'id', u.id,
          'profile_id', u.profile_id,
          'username', u.username,
          'player_name', u.player_name,
          'profile_image_url', u.profile_image_url,
          'last_seen_at', u.last_seen_at,
          'is_online', CASE 
            WHEN u.last_seen_at IS NOT NULL AND (EXTRACT(EPOCH FROM (NOW() - u.last_seen_at)) * 1000) < 300000 
            THEN true 
            ELSE false 
          END
        ) as other_user,
        row_to_json(lm) as last_message,
        COALESCE(uc.unread_count, 0)::int as unread_count
      FROM last_messages lm
      JOIN users u ON lm.other_user_id = u.id
      LEFT JOIN unread_counts uc ON lm.other_user_id = uc.other_user_id
      ORDER BY lm.created_at DESC`, [userId]);
        return result.rows.map(row => ({
            other_user_id: row.other_user_id,
            other_user: row.other_user,
            last_message: row.last_message,
            unread_count: row.unread_count
        }));
    }
}
exports.MessageModel = MessageModel;
