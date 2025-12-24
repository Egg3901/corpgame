import pool from '../db/connection';

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
    
    const result = await pool.query(
      `INSERT INTO reported_chats (reporter_id, reported_user_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id, reporter_id, reported_user_id, reason, reviewed, reviewed_by, reviewed_at, created_at`,
      [reporter_id, reported_user_id, reason || null]
    );
    
    return result.rows[0];
  }

  static async findById(id: number): Promise<ReportedChat | null> {
    const result = await pool.query(
      'SELECT * FROM reported_chats WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async findAll(includeReviewed: boolean = false): Promise<ReportedChatWithUsers[]> {
    let query = `
      SELECT 
        rc.*,
        json_build_object(
          'id', r.id,
          'profile_id', r.profile_id,
          'username', r.username,
          'player_name', r.player_name,
          'profile_image_url', r.profile_image_url
        ) as reporter,
        json_build_object(
          'id', ru.id,
          'profile_id', ru.profile_id,
          'username', ru.username,
          'player_name', ru.player_name,
          'profile_image_url', ru.profile_image_url
        ) as reported_user,
        CASE 
          WHEN rc.reviewed_by IS NOT NULL THEN
            json_build_object(
              'id', rb.id,
              'profile_id', rb.profile_id,
              'username', rb.username,
              'player_name', rb.player_name
            )
          ELSE NULL
        END as reviewed_by_user
      FROM reported_chats rc
      JOIN users r ON rc.reporter_id = r.id
      JOIN users ru ON rc.reported_user_id = ru.id
      LEFT JOIN users rb ON rc.reviewed_by = rb.id
    `;

    if (!includeReviewed) {
      query += ' WHERE rc.reviewed = false';
    }

    query += ' ORDER BY rc.created_at DESC';

    const result = await pool.query(query);
    return result.rows;
  }

  static async markAsReviewed(id: number, reviewedBy: number): Promise<ReportedChat | null> {
    const result = await pool.query(
      `UPDATE reported_chats 
       SET reviewed = true, reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [reviewedBy, id]
    );
    
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM reported_chats WHERE id = $1 RETURNING id',
      [id]
    );
    
    return result.rows.length > 0;
  }
}



