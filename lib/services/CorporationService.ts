import { CorporationModel, CreateCorporationData } from '../models/Corporation';
import { MarketEntryModel } from '../models/MarketEntry';
import { BusinessUnitModel } from '../models/BusinessUnit';
import { UserModel } from '../models/User';
import { MessageModel } from '../models/Message';

export class CorporationService {
  /**
   * Creates a new corporation for a user if they don't already have one.
   * Includes default market entry and business unit setup.
   */
  static async createForUser(user: { id: number; player_name: string; starting_state: string; username: string }) {
    // 1. Check if user already has a corporation (is CEO)
    const existingCorps = await CorporationModel.findByCeoId(user.id);
    if (existingCorps.length > 0) {
      return existingCorps[0];
    }

    // 2. Generate a unique corporation name
    let baseName = `${user.player_name || user.username}'s Enterprise`;
    let name = baseName;
    let counter = 1;

    while (await CorporationModel.findByName(name)) {
      counter++;
      name = `${baseName} ${counter}`;
    }

    // 3. Create the Corporation
    // Defaults: 500k capital, 500k shares, 100k public, $1.00 price, 'diversified' focus
    const corpData: CreateCorporationData = {
      ceo_id: user.id,
      name: name,
      shares: 500000,
      public_shares: 100000,
      share_price: 1.00,
      capital: 500000.00,
      type: null, // Legacy field, we use focus now? Or type is sector? Model says type is sector string or null.
      focus: 'diversified',
    };

    const corporation = await CorporationModel.create(corpData);

    // 4. Create initial Market Entry in starting state
    // Default to 'Retail' sector as it's generally accessible
    const marketEntry = await MarketEntryModel.create({
      corporation_id: corporation.id,
      state_code: user.starting_state,
      sector_type: 'Retail',
    });

    // 5. Create initial Business Unit
    // Give them 1 Retail unit to start
    await BusinessUnitModel.create({
      market_entry_id: marketEntry.id,
      unit_type: 'retail',
      count: 1,
    });

    // 6. Notify the user
    try {
      await MessageModel.create({
        sender_id: 1, // System
        recipient_id: user.id,
        subject: 'Corporation Established!',
        body: `Congratulations! Your corporation "${name}" has been established.\n\nWe have set up your headquarters in ${user.starting_state} and established a Retail presence.\n\nYou have been granted:\n• $500,000.00 in Capital\n• 1 Retail Unit in ${user.starting_state}\n\nGood luck, CEO!`,
      });
    } catch (error: unknown) {
      console.warn('Failed to send corporation creation notification', error);
    }

    return corporation;
  }
}
