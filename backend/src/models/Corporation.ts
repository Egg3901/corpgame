import pool from '../db/connection';

export interface Corporation {
  id: number;
  ceo_id: number;
  name: string;
  logo?: string | null;
  shares: number;
  public_shares: number;
  share_price: number;
  capital: number;
  type?: string | null;
  hq_state?: string | null;
  board_size: number;
  elected_ceo_id?: number | null;
  ceo_salary: number; // Per 96 hours, default 100000
  created_at: Date;
}

export interface CorporationInput {
  ceo_id: number;
  name: string;
  logo?: string | null;
  shares?: number;
  public_shares?: number;
  share_price?: number;
  capital?: number;
  type?: string | null;
  hq_state?: string | null;
  board_size?: number;
  elected_ceo_id?: number | null;
  ceo_salary?: number;
}

export class CorporationModel {
  static async create(corpData: CorporationInput): Promise<Corporation> {
    const {
      ceo_id,
      name,
      logo = null,
      shares = 500000,
      public_shares = 100000,
      share_price = 1.00,
      capital = 500000.00,
      type = null,
    } = corpData;

    const result = await pool.query(
      `INSERT INTO corporations (ceo_id, name, logo, shares, public_shares, share_price, capital, type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [ceo_id, name.trim(), logo, shares, public_shares, share_price, capital, type]
    );

    return result.rows[0];
  }

  static async findById(id: number): Promise<Corporation | null> {
    const result = await pool.query('SELECT * FROM corporations WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<Corporation[]> {
    const result = await pool.query('SELECT * FROM corporations ORDER BY created_at DESC');
    return result.rows;
  }

  static async findByCeoId(ceoId: number): Promise<Corporation[]> {
    const result = await pool.query(
      'SELECT * FROM corporations WHERE ceo_id = $1 ORDER BY created_at DESC',
      [ceoId]
    );
    return result.rows;
  }

  static async update(id: number, updates: Partial<CorporationInput>): Promise<Corporation | null> {
    const allowedFields = ['name', 'logo', 'type', 'share_price', 'capital', 'public_shares', 'hq_state', 'board_size', 'elected_ceo_id', 'ceo_salary'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE corporations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM corporations WHERE id = $1', [id]);
  }

  // Clear the elected CEO (for resignation)
  static async clearElectedCeo(id: number): Promise<Corporation | null> {
    const result = await pool.query(
      `UPDATE corporations SET elected_ceo_id = NULL WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  // Set elected CEO
  static async setElectedCeo(id: number, ceoUserId: number): Promise<Corporation | null> {
    const result = await pool.query(
      `UPDATE corporations SET elected_ceo_id = $1 WHERE id = $2 RETURNING *`,
      [ceoUserId, id]
    );
    return result.rows[0] || null;
  }
}
