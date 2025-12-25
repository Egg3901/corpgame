import pool from '../db/connection';

export type ActionType = 'supply_rush' | 'marketing_campaign';

export interface CorporateAction {
  id: number;
  corporation_id: number;
  action_type: ActionType;
  cost: number;
  started_at: Date;
  expires_at: Date;
  created_at: Date;
}

export interface CreateCorporateActionData {
  corporation_id: number;
  action_type: ActionType;
  cost: number;
  started_at?: Date;
  expires_at: Date;
}

export class CorporateActionModel {
  static mapRow(row: any): CorporateAction | null {
    if (!row) return row;
    return {
      ...row,
      cost: typeof row.cost === 'string' ? parseFloat(row.cost) : row.cost,
    };
  }

  static async create(actionData: CreateCorporateActionData): Promise<CorporateAction> {
    const {
      corporation_id,
      action_type,
      cost,
      started_at = new Date(),
      expires_at,
    } = actionData;

    const result = await pool.query(
      `INSERT INTO corporate_actions (corporation_id, action_type, cost, started_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [corporation_id, action_type, cost, started_at, expires_at]
    );
    return this.mapRow(result.rows[0])!;
  }

  static async findById(id: number): Promise<CorporateAction | null> {
    const result = await pool.query('SELECT * FROM corporate_actions WHERE id = $1', [id]);
    return this.mapRow(result.rows[0]) || null;
  }

  static async findByCorporationId(corporationId: number): Promise<CorporateAction[]> {
    const result = await pool.query(
      'SELECT * FROM corporate_actions WHERE corporation_id = $1 ORDER BY created_at DESC',
      [corporationId]
    );
    return result.rows.map(row => this.mapRow(row)!);
  }

  // Get active action for a corporation of a specific type
  static async findActiveAction(corporationId: number, actionType: ActionType): Promise<CorporateAction | null> {
    const result = await pool.query(
      `SELECT * FROM corporate_actions 
       WHERE corporation_id = $1 
       AND action_type = $2 
       AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [corporationId, actionType]
    );
    return this.mapRow(result.rows[0]) || null;
  }

  // Get all active actions for a corporation
  static async findAllActiveActions(corporationId: number): Promise<CorporateAction[]> {
    const result = await pool.query(
      `SELECT * FROM corporate_actions 
       WHERE corporation_id = $1 
       AND expires_at > NOW()
       ORDER BY expires_at DESC`,
      [corporationId]
    );
    return result.rows.map(row => this.mapRow(row)!);
  }

  // Check if a corporation has an active action of a specific type
  static async hasActiveAction(corporationId: number, actionType: ActionType): Promise<boolean> {
    const action = await this.findActiveAction(corporationId, actionType);
    return action !== null;
  }

  // Get all expired actions (for cleanup)
  static async findExpiredActions(): Promise<CorporateAction[]> {
    const result = await pool.query(
      'SELECT * FROM corporate_actions WHERE expires_at <= NOW() ORDER BY expires_at ASC'
    );
    return result.rows.map(row => this.mapRow(row)!);
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM corporate_actions WHERE id = $1', [id]);
  }

  // Delete all expired actions (for cleanup)
  static async deleteExpiredActions(): Promise<number> {
    const result = await pool.query('DELETE FROM corporate_actions WHERE expires_at <= NOW()');
    return result.rowCount || 0;
  }
}

