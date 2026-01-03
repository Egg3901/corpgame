import { getDb } from '../db/mongo';

export interface StateMetadata {
  state_code: string;
  name: string;
  region: string;
  description?: string;
  resource_modifiers?: Record<string, number>;
  image_url?: string;
  population_multiplier?: number | string;
}

export class StateMetadataModel {
  static async findAll(): Promise<StateMetadata[]> {
    return await getDb().collection<StateMetadata>('state_metadata')
      .find({})
      .sort({ name: 1 })
      .toArray();
  }

  static async findByCode(stateCode: string): Promise<StateMetadata | null> {
    return await getDb().collection<StateMetadata>('state_metadata').findOne({ state_code: stateCode.toUpperCase() });
  }

  static async findByRegion(region: string): Promise<StateMetadata[]> {
    return await getDb().collection<StateMetadata>('state_metadata')
      .find({ region })
      .sort({ name: 1 })
      .toArray();
  }
}
