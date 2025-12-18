import cron from 'node-cron';
import { UserModel } from '../models/User';
import { CorporationModel } from '../models/Corporation';

/**
 * Hourly cron job to add actions to all users
 * - All users get +2 actions per hour
 * - CEOs (users who are the ceo_id of any corporation) get an additional +1 action
 */
export function startActionsCron() {
  // Run every hour at the start of the hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly actions increment...');
    
    try {
      // Get all CEO user IDs
      const corporations = await CorporationModel.findAll();
      const ceoUserIds = corporations.map(corp => corp.ceo_id);
      
      // Remove duplicates (in case someone is CEO of multiple corporations)
      const uniqueCeoUserIds = [...new Set(ceoUserIds)];
      
      // Increment all users by 2, CEOs get +1 more
      const result = await UserModel.incrementAllUsersActions(2, uniqueCeoUserIds);
      
      console.log(`[Cron] Actions incremented for ${result.updated} users. CEOs (${uniqueCeoUserIds.length}): +3, Others: +2`);
    } catch (error) {
      console.error('[Cron] Error incrementing actions:', error);
    }
  });

  console.log('[Cron] Actions cron job scheduled (runs every hour at :00)');
}

/**
 * Manual trigger for testing - can be called from an admin endpoint
 */
export async function triggerActionsIncrement(): Promise<{ updated: number; ceoCount: number }> {
  const corporations = await CorporationModel.findAll();
  const ceoUserIds = corporations.map(corp => corp.ceo_id);
  const uniqueCeoUserIds = [...new Set(ceoUserIds)];
  
  const result = await UserModel.incrementAllUsersActions(2, uniqueCeoUserIds);
  
  return { updated: result.updated, ceoCount: uniqueCeoUserIds.length };
}
