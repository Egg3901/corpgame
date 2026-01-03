import cron, { ScheduledTask } from 'node-cron';
import { UserModel } from '../models/User';
import { CorporationModel } from '../models/Corporation';
import { BoardProposalModel } from '../models/BoardProposal';
import { MarketEntryModel } from '../models/MarketEntry';
import { TransactionModel } from '../models/Transaction';
import { ShareholderModel } from '../models/Shareholder';
import { updateStockPrice } from '../utils/valuation';
import { SharePriceHistoryModel } from '../models/SharePriceHistory';
import { CommodityPriceHistoryModel } from '../models/CommodityPriceHistory';
import { ProductPriceHistoryModel } from '../models/ProductPriceHistory';
import { GameSettingsModel } from '../models/GameSettings';
import { getDb } from '../db/mongo';
import { ACTIONS_CONFIG } from '../constants/actions';
import { getErrorMessage } from '../utils';
import { RESOURCES, PRODUCTS } from '../constants/sectors';

// Default CEO salary constants (used only as fallback)
const DEFAULT_CEO_SALARY_PER_96H = 100000; // $100,000 per 96 hours

// Store cron job references to prevent duplicate jobs on hot reload
let scheduledTasks: ScheduledTask[] = [];

/**
 * Hourly cron job to add actions to all users
 * - All users get +2 actions per hour
 * - CEOs (users who are the ceo_id of any corporation) get an additional +1 action
 */
export async function triggerActionsIncrement(): Promise<{ updated: number; ceoCount: number }> {
  const corporations = await CorporationModel.findAll();
  const ceoUserIds = corporations.map(corp => corp.ceo_id).filter(id => id !== null) as number[];
  
  // Remove duplicates (in case someone is CEO of multiple corporations)
  const uniqueCeoUserIds = Array.from(new Set(ceoUserIds));
  
  // Increment all users by 2, CEOs get +1 more
  const result = await UserModel.incrementAllUsersActions(2, uniqueCeoUserIds);
  
  console.log(`[Cron] Actions incremented for ${result.updated} users. CEOs (${uniqueCeoUserIds.length}): +3, Others: +2`);
  
  return { updated: result.updated, ceoCount: uniqueCeoUserIds.length };
}

/**
 * Process market revenue/costs for all corporations with business units
 * Called hourly to add net profit to corporation capital
 * Applies 10% boost from active Supply Rush or Marketing Campaign actions
 */
export async function triggerMarketRevenue(): Promise<{ processed: number; totalProfit: number }> {
  try {
    console.log('[Cron] Processing market revenue/costs...');
    
    // Get all corporations with their hourly financials
    const corpFinancials = await MarketEntryModel.getAllCorporationsFinancials();
    
    if (corpFinancials.length === 0) {
      console.log('[Cron] No corporations with business units to process');
      return { processed: 0, totalProfit: 0 };
    }

    // Get all active corporate actions for performance boost
    const db = getDb();
    const activeActionsQuery = await db.collection('corporate_actions')
      .find({ expires_at: { $gt: new Date() } })
      .toArray();
    
    // Build a map of corporation_id -> set of active action types
    const activeCorporateActions = new Map<number, Set<string>>();
    for (const action of activeActionsQuery) {
      if (!activeCorporateActions.has(action.corporation_id)) {
        activeCorporateActions.set(action.corporation_id, new Set());
      }
      activeCorporateActions.get(action.corporation_id)!.add(action.action_type);
    }

    let totalProcessed = 0;
    let totalRevenue = 0;

    for (const { corporation_id, hourly_profit } of corpFinancials) {
      if (hourly_profit === 0) continue;

      try {
        // Get current corporation capital
        const corp = await CorporationModel.findById(corporation_id);
        if (!corp) continue;

        const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;

        // Apply corporate action boost if active
        let adjustedProfit = hourly_profit;
        const activeActions = activeCorporateActions.get(corporation_id);
        
        let boostNote = '';
        if (activeActions) {
          let boostMultiplier = 1.0;
          let boostDescription = '';
          
          if (activeActions.has('supply_rush')) {
            boostMultiplier += 0.10; // +10% boost
            boostDescription = ' (Supply Rush +10%)';
          }
          
          if (activeActions.has('marketing_campaign')) {
            boostMultiplier += 0.10; // +10% boost
            boostDescription += boostDescription ? ', Marketing Campaign +10%' : ' (Marketing Campaign +10%)';
          }
          
          if (boostMultiplier > 1.0) {
            adjustedProfit = hourly_profit * boostMultiplier;
            boostNote = boostDescription;
          }
        }

        // Add profit (or subtract loss)
        const newCapital = currentCapital + adjustedProfit;
        
        await CorporationModel.update(corporation_id, { capital: newCapital });
        
        // Log transaction
        await TransactionModel.create({
          corporation_id,
          transaction_type: adjustedProfit >= 0 ? 'market_revenue' : 'market_cost',
          amount: Math.abs(adjustedProfit),
          description: `Hourly market ${adjustedProfit >= 0 ? 'revenue' : 'costs'}${boostNote}`,
          from_user_id: null // System transaction
        });

        totalProcessed++;
        totalRevenue += adjustedProfit;
      } catch (err: unknown) {
        console.error(`[Cron] Error processing financials for corp ${corporation_id}:`, getErrorMessage(err));
      }
    }
    
    console.log(`[Cron] Processed financials for ${totalProcessed} corporations. Net total: ${totalRevenue}`);
    return { processed: totalProcessed, totalProfit: totalRevenue };
  } catch (error: unknown) {
    console.error('[Cron] Error in market revenue job:', getErrorMessage(error));
    return { processed: 0, totalProfit: 0 };
  }
}

/**
 * Pay CEO salaries
 * - Runs every 96 hours (4 days) - but simplified here to check last payment
 * - Checks if 96h has passed since last salary payment
 * - Deducts from corp capital, adds to CEO cash
 */
export async function triggerCeoSalaries(): Promise<{ ceos_paid: number; total_paid: number; salaries_zeroed: number; skipped_recently_paid: number }> {
  try {
    const corporations = await CorporationModel.findAll();
    const now = new Date();
    const SALARY_INTERVAL_HOURS = 96; // 4 days

    let paidCount = 0;
    let totalPaid = 0;
    let salariesZeroed = 0;
    let skippedRecentlyPaid = 0;

    for (const corp of corporations) {
      if (!corp.ceo_id) continue;

      // Check if salary was paid recently (within 96 hours) to prevent double-payment
      if (corp.ceo_salary_last_paid_at) {
        const lastPaid = new Date(corp.ceo_salary_last_paid_at);
        const hoursSinceLast = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < SALARY_INTERVAL_HOURS) {
          skippedRecentlyPaid++;
          continue;
        }
      }

      // Determine salary amount (use default if not set)
      const salary = corp.ceo_salary || DEFAULT_CEO_SALARY_PER_96H;

      // Check if corp has enough capital
      const corpCapital = typeof corp.capital === 'string' ? parseFloat(String(corp.capital)) : (corp.capital || 0);
      if (corpCapital < salary) {
        console.log(`[Cron] Corp ${corp.id} cannot afford CEO salary (${salary}). Capital: ${corpCapital}`);
        salariesZeroed++;
        continue;
      }

      // Pay CEO and record payment time
      try {
        await CorporationModel.update(corp.id, {
          capital: corpCapital - salary,
          ceo_salary_last_paid_at: now
        });
        await UserModel.updateCash(corp.ceo_id, salary);

        await TransactionModel.create({
          corporation_id: corp.id,
          transaction_type: 'ceo_salary',
          amount: salary,
          description: `CEO Salary Payment`,
          to_user_id: corp.ceo_id
        });

        paidCount++;
        totalPaid += salary;
      } catch (err: unknown) {
        console.error(`[Cron] Error paying CEO of corp ${corp.id}:`, getErrorMessage(err));
      }
    }

    console.log(`[Cron] Paid salaries for ${paidCount} CEOs (${skippedRecentlyPaid} skipped - recently paid)`);
    return { ceos_paid: paidCount, total_paid: totalPaid, salaries_zeroed: salariesZeroed, skipped_recently_paid: skippedRecentlyPaid };
  } catch (error: unknown) {
    console.error('[Cron] Error in CEO salary job:', getErrorMessage(error));
    return { ceos_paid: 0, total_paid: 0, salaries_zeroed: 0, skipped_recently_paid: 0 };
  }
}

/**
 * Pay Dividends
 * - Runs every 24 hours (1 year in game time)
 * - Pays dividend_percentage of profits/capital to shareholders
 */
export async function triggerDividends(): Promise<void> {
  try {
    const corporations = await CorporationModel.findAll();
    let paidCount = 0;
    
    for (const corp of corporations) {
      if (corp.dividend_percentage <= 0) continue;
      
      // Calculate dividend amount based on policy
      // Usually dividends are % of annual profit, but here we might simplify to % of capital or a fixed amount
      // Let's assume for now it's a small % of capital as a placeholder, 
      // but in a real game it should be based on earnings.
      
      // SAFEGUARD: Don't pay out if capital is low
      if (corp.capital < 100000) continue;
      
      const totalDividend = corp.capital * (corp.dividend_percentage / 100);
      const dividendPerShare = totalDividend / corp.shares;
      
      if (dividendPerShare < 0.01) continue;
      
      // Get all shareholders
      const shareholders = await ShareholderModel.findByCorporationId(corp.id);
      
      // Pay each shareholder
      for (const sh of shareholders) {
        const payout = dividendPerShare * sh.shares;
        if (payout > 0) {
          await UserModel.updateCash(sh.user_id, payout);
        }
      }
      
      // Deduct from corp
      await CorporationModel.update(corp.id, { capital: corp.capital - totalDividend });
      
      await TransactionModel.create({
        corporation_id: corp.id,
        transaction_type: 'dividend',
        amount: totalDividend,
        description: `Dividend Payment (${corp.dividend_percentage}%)`
      });
      
      paidCount++;
    }
    
    console.log(`[Cron] Paid dividends for ${paidCount} corporations`);
  } catch (error: unknown) {
    console.error('[Cron] Error in dividend job:', getErrorMessage(error));
  }
}

/**
 * Record price history for all commodities and products
 * - Runs every hour
 * - Saves current prices along with supply/demand for historical tracking
 */
export async function triggerPriceHistoryRecording(): Promise<{ commodities: number; products: number }> {
  try {
    console.log('[Cron] Recording market price history...');

    // Get current market data (prices, supply, demand)
    const marketData = await MarketEntryModel.getMarketData();
    const { commodityPrices, commoditySupply, commodityDemand, productPrices, productSupply, productDemand } = marketData;

    let commoditiesRecorded = 0;
    let productsRecorded = 0;

    // Record commodity prices
    for (const resource of RESOURCES) {
      try {
        const price = commodityPrices[resource] || 0;
        const supply = commoditySupply[resource] || 0;
        const demand = commodityDemand[resource] || 0;

        await CommodityPriceHistoryModel.create({
          resource_name: resource,
          price,
          supply,
          demand,
        });
        commoditiesRecorded++;
      } catch (err: unknown) {
        console.error(`[Cron] Error recording commodity price for ${resource}:`, getErrorMessage(err));
      }
    }

    // Record product prices
    for (const product of PRODUCTS) {
      try {
        const price = productPrices[product] || 0;
        const supply = productSupply[product] || 0;
        const demand = productDemand[product] || 0;

        await ProductPriceHistoryModel.create({
          product_name: product,
          price,
          supply,
          demand,
        });
        productsRecorded++;
      } catch (err: unknown) {
        console.error(`[Cron] Error recording product price for ${product}:`, getErrorMessage(err));
      }
    }

    console.log(`[Cron] Recorded prices for ${commoditiesRecorded} commodities and ${productsRecorded} products`);
    return { commodities: commoditiesRecorded, products: productsRecorded };
  } catch (error: unknown) {
    console.error('[Cron] Error in price history recording:', getErrorMessage(error));
    return { commodities: 0, products: 0 };
  }
}

/**
 * Check for expired board proposals and resolve them
 * - Runs every hour
 */
export async function resolveExpiredProposals(): Promise<void> {
  try {
    const expiredProposals = await BoardProposalModel.getExpiredActiveProposals();
    
    if (expiredProposals.length === 0) {
      console.log('[Cron] No expired proposals to resolve');
      return;
    }

    console.log(`[Cron] Found ${expiredProposals.length} expired proposals to resolve`);

    for (const proposal of expiredProposals) {
      try {
        await BoardProposalModel.resolve(proposal.id);
        console.log(`[Cron] Resolved proposal ${proposal.id}`);
      } catch (err: unknown) {
        console.error(`[Cron] Error resolving proposal ${proposal.id}:`, getErrorMessage(err));
      }
    }
  } catch (error: unknown) {
    console.error('[Cron] Error in proposal resolution:', getErrorMessage(error));
  }
}

/**
 * Stop all scheduled cron jobs
 * Call this before starting new jobs to prevent duplicates
 */
export function stopAllCronJobs(): void {
  if (scheduledTasks.length > 0) {
    console.log(`[Cron] Stopping ${scheduledTasks.length} existing cron jobs...`);
    for (const task of scheduledTasks) {
      task.stop();
    }
    scheduledTasks = [];
  }
}

/**
 * Start all cron jobs
 * Should be called from instrumentation.ts or server startup
 * Automatically stops existing jobs first to prevent duplicates on hot reload
 */
export function startActionsCron() {
  // Stop any existing jobs first to prevent duplicates on hot reload
  stopAllCronJobs();

  console.log('[Cron] Initializing cron jobs...');

  // 1. Actions Increment: Every hour
  scheduledTasks.push(cron.schedule('0 * * * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping actions increment (cron disabled)');
      return;
    }
    console.log('[Cron] Running hourly actions increment...');
    await triggerActionsIncrement();
  }));

  // 2. Market Revenue: Every hour (at minute 30 to distribute load)
  scheduledTasks.push(cron.schedule('30 * * * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping market revenue (cron disabled)');
      return;
    }
    console.log('[Cron] Running hourly market revenue...');
    await triggerMarketRevenue();
  }));

  // 3. Proposal Resolution: Every 10 minutes
  scheduledTasks.push(cron.schedule('*/10 * * * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping proposal resolution (cron disabled)');
      return;
    }
    console.log('[Cron] Checking for expired proposals...');
    await resolveExpiredProposals();
  }));

  // 4. Price History Recording: Every hour (at minute 15 to distribute load)
  scheduledTasks.push(cron.schedule('15 * * * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping price history recording (cron disabled)');
      return;
    }
    console.log('[Cron] Recording market price history...');
    await triggerPriceHistoryRecording();
  }));

  // 5. CEO Salaries: Every 4 days (at midnight)
  // 0 0 */4 * * -> At 00:00 on every 4th day-of-month
  // This is approximation.
  scheduledTasks.push(cron.schedule('0 0 */4 * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping CEO salaries (cron disabled)');
      return;
    }
    console.log('[Cron] Running CEO salary check...');
    await triggerCeoSalaries();
  }));

  // 6. Dividends: Daily at 12:00
  scheduledTasks.push(cron.schedule('0 12 * * *', async () => {
    if (!await GameSettingsModel.isCronEnabled()) {
      console.log('[Cron] Skipping dividends (cron disabled)');
      return;
    }
    console.log('[Cron] Running daily dividend check...');
    await triggerDividends();
  }));

  console.log('[Cron] Jobs scheduled: Actions(1h), Market(1h), Proposals(10m), Prices(1h), Salaries(4d), Dividends(24h)');
}
