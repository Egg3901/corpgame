import { getDb, getNextId } from '../db/mongo';

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
  static async create(actionData: CreateCorporateActionData): Promise<CorporateAction> {
    const {
      corporation_id,
      action_type,
      cost,
      started_at = new Date(),
      expires_at,
    } = actionData;

    const id = await getNextId('corporate_actions_id');
    const now = new Date(); // created_at

    const doc: CorporateAction = {
      id,
      corporation_id,
      action_type,
      cost,
      started_at,
      expires_at,
      created_at: now,
    };

    await getDb().collection<CorporateAction>('corporate_actions').insertOne(doc);
    return doc;
  }

  static async findById(id: number): Promise<CorporateAction | null> {
    return await getDb().collection<CorporateAction>('corporate_actions').findOne({ id });
  }

  static async findByCorporationId(corporationId: number): Promise<CorporateAction[]> {
    return await getDb()
      .collection<CorporateAction>('corporate_actions')
      .find({ corporation_id: corporationId })
      .sort({ created_at: -1 })
      .toArray();
  }

  // Get active action for a corporation of a specific type
  static async findActiveAction(corporationId: number, actionType: ActionType): Promise<CorporateAction | null> {
    const now = new Date();
    return await getDb().collection<CorporateAction>('corporate_actions').findOne(
      { 
        corporation_id: corporationId,
        action_type: actionType,
        expires_at: { $gt: now }
      },
      { sort: { expires_at: -1 } }
    );
  }

  // Get all active actions for a corporation
  static async findAllActiveActions(corporationId: number): Promise<CorporateAction[]> {
    const now = new Date();
    return await getDb()
      .collection<CorporateAction>('corporate_actions')
      .find({ 
        corporation_id: corporationId,
        expires_at: { $gt: now }
      })
      .sort({ expires_at: -1 })
      .toArray();
  }

  // Check if a corporation has an active action of a specific type
  static async hasActiveAction(corporationId: number, actionType: ActionType): Promise<boolean> {
    const action = await this.findActiveAction(corporationId, actionType);
    return action !== null;
  }

  // Get all expired actions (for cleanup)
  static async findExpiredActions(): Promise<CorporateAction[]> {
    const now = new Date();
    return await getDb()
      .collection<CorporateAction>('corporate_actions')
      .find({ expires_at: { $lte: now } })
      .sort({ expires_at: 1 })
      .toArray();
  }
}
