"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startActionsCron = startActionsCron;
exports.triggerActionsIncrement = triggerActionsIncrement;
exports.triggerCeoSalaries = triggerCeoSalaries;
exports.triggerDividends = triggerDividends;
exports.triggerMarketRevenue = triggerMarketRevenue;
exports.getNextCronTimes = getNextCronTimes;
const node_cron_1 = __importDefault(require("node-cron"));
const User_1 = require("../models/User");
const Corporation_1 = require("../models/Corporation");
const BoardProposal_1 = require("../models/BoardProposal");
const Message_1 = require("../models/Message");
const MarketEntry_1 = require("../models/MarketEntry");
const Transaction_1 = require("../models/Transaction");
const Shareholder_1 = require("../models/Shareholder");
const valuation_1 = require("../utils/valuation");
const SharePriceHistory_1 = require("../models/SharePriceHistory");
const CommodityPriceHistory_1 = require("../models/CommodityPriceHistory");
const ProductPriceHistory_1 = require("../models/ProductPriceHistory");
const connection_1 = __importDefault(require("../db/connection"));
// Default CEO salary constants (used only as fallback)
const DEFAULT_CEO_SALARY_PER_96H = 100000; // $100,000 per 96 hours
/**
 * Hourly cron job to add actions to all users
 * - All users get +2 actions per hour
 * - CEOs (users who are the ceo_id of any corporation) get an additional +1 action
 */
function startActionsCron() {
    // Run every hour at the start of the hour
    node_cron_1.default.schedule('0 * * * *', async () => {
        console.log('[Cron] Running hourly actions increment...');
        try {
            // Get all CEO user IDs
            const corporations = await Corporation_1.CorporationModel.findAll();
            const ceoUserIds = corporations.map(corp => corp.ceo_id);
            // Remove duplicates (in case someone is CEO of multiple corporations)
            const uniqueCeoUserIds = [...new Set(ceoUserIds)];
            // Increment all users by 2, CEOs get +1 more
            const result = await User_1.UserModel.incrementAllUsersActions(2, uniqueCeoUserIds);
            console.log(`[Cron] Actions incremented for ${result.updated} users. CEOs (${uniqueCeoUserIds.length}): +3, Others: +2`);
            // Process market revenue/costs for all corporations
            await processMarketRevenue();
            // Process CEO salaries
            await processCeoSalaries();
            // Process dividends
            await processDividends();
        }
        catch (error) {
            console.error('[Cron] Error incrementing actions:', error);
        }
    });
    console.log('[Cron] Actions cron job scheduled (runs every hour at :00)');
    // Run every 5 minutes to check for expired proposals
    node_cron_1.default.schedule('*/5 * * * *', async () => {
        console.log('[Cron] Running proposal resolution check...');
        try {
            const expiredProposals = await BoardProposal_1.BoardProposalModel.getExpiredActiveProposals();
            if (expiredProposals.length === 0) {
                console.log('[Cron] No expired proposals to resolve');
                return;
            }
            console.log(`[Cron] Found ${expiredProposals.length} expired proposals to resolve`);
            for (const proposal of expiredProposals) {
                try {
                    await resolveExpiredProposal(proposal);
                    console.log(`[Cron] Resolved proposal ${proposal.id}`);
                }
                catch (err) {
                    console.error(`[Cron] Error resolving proposal ${proposal.id}:`, err);
                }
            }
        }
        catch (error) {
            console.error('[Cron] Error in proposal resolution:', error);
        }
    });
    console.log('[Cron] Proposal resolution cron job scheduled (runs every 5 minutes)');
    // Run every 10 minutes to record market prices (stock-style history)
    node_cron_1.default.schedule('*/10 * * * *', async () => {
        console.log('[Cron] Recording market prices...');
        try {
            await recordMarketPrices();
        }
        catch (error) {
            console.error('[Cron] Error recording market prices:', error);
        }
    });
    console.log('[Cron] Market price history cron job scheduled (runs every 10 minutes)');
}
/**
 * Manual trigger for testing - can be called from an admin endpoint
 */
async function triggerActionsIncrement() {
    const corporations = await Corporation_1.CorporationModel.findAll();
    const ceoUserIds = corporations.map(corp => corp.ceo_id);
    const uniqueCeoUserIds = [...new Set(ceoUserIds)];
    const result = await User_1.UserModel.incrementAllUsersActions(2, uniqueCeoUserIds);
    return { updated: result.updated, ceoCount: uniqueCeoUserIds.length };
}
/**
 * Resolve an expired proposal
 */
async function resolveExpiredProposal(proposal) {
    const voteCounts = await BoardProposal_1.BoardVoteModel.getVoteCounts(proposal.id);
    const passed = voteCounts.aye > voteCounts.nay;
    // Update proposal status
    await BoardProposal_1.BoardProposalModel.updateStatus(proposal.id, passed ? 'passed' : 'failed');
    if (passed) {
        // Apply the changes
        await applyProposalChanges(proposal);
    }
    // Notify board members of outcome (system message)
    const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(proposal.corporation_id);
    const corporation = await Corporation_1.CorporationModel.findById(proposal.corporation_id);
    const proposalDescription = getProposalDescription(proposal.proposal_type, proposal.proposal_data);
    for (const member of boardMembers) {
        try {
            await Message_1.MessageModel.create({
                sender_id: 1, // System user ID
                recipient_id: member.user_id,
                subject: `Board Vote Result: ${corporation?.name || 'Corporation'}`,
                body: `The proposal "${proposalDescription}" has ${passed ? 'PASSED' : 'FAILED'}.\n\nVotes: ${voteCounts.aye} Aye, ${voteCounts.nay} Nay`,
            });
        }
        catch (msgErr) {
            console.warn(`[Cron] Failed to send vote notification to user ${member.user_id}:`, msgErr);
        }
    }
}
/**
 * Apply changes from a passed proposal
 */
async function applyProposalChanges(proposal) {
    const corpId = proposal.corporation_id;
    const data = proposal.proposal_data;
    switch (proposal.proposal_type) {
        case 'ceo_nomination':
            await Corporation_1.CorporationModel.setElectedCeo(corpId, data.nominee_id);
            break;
        case 'sector_change':
            await Corporation_1.CorporationModel.update(corpId, { type: data.new_sector });
            break;
        case 'hq_change':
            await Corporation_1.CorporationModel.update(corpId, { hq_state: data.new_state });
            break;
        case 'board_size':
            await Corporation_1.CorporationModel.update(corpId, { board_size: data.new_size });
            break;
        case 'appoint_member':
            // Create board appointment
            await connection_1.default.query(`INSERT INTO board_appointments (corporation_id, user_id, appointed_by_proposal_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (corporation_id, user_id) DO NOTHING`, [corpId, data.appointee_id, proposal.id]);
            break;
        case 'ceo_salary_change':
            await Corporation_1.CorporationModel.update(corpId, { ceo_salary: data.new_salary });
            break;
        case 'dividend_change':
            await Corporation_1.CorporationModel.update(corpId, { dividend_percentage: data.new_percentage });
            break;
        case 'special_dividend':
            // Pay special dividend immediately when proposal passes
            const specialCorp = await Corporation_1.CorporationModel.findById(corpId);
            if (specialCorp) {
                const capitalPercentage = data.capital_percentage / 100;
                const currentCapital = typeof specialCorp.capital === 'string' ? parseFloat(specialCorp.capital) : specialCorp.capital;
                const dividendAmount = currentCapital * capitalPercentage;
                // Get all shareholders
                const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corpId);
                const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0) + specialCorp.public_shares;
                if (totalShares > 0 && dividendAmount > 0) {
                    // Pay each shareholder their proportional share
                    for (const shareholder of shareholders) {
                        const shareholderPayout = (dividendAmount * shareholder.shares) / totalShares;
                        await User_1.UserModel.updateCash(shareholder.user_id, shareholderPayout);
                        // Record transaction
                        await Transaction_1.TransactionModel.create({
                            transaction_type: 'special_dividend',
                            amount: shareholderPayout,
                            from_user_id: null,
                            to_user_id: shareholder.user_id,
                            corporation_id: corpId,
                            description: `Special dividend from ${specialCorp.name} (${data.capital_percentage}% of capital)`,
                        });
                    }
                    // Deduct dividend from corporation capital
                    const newCapital = currentCapital - dividendAmount;
                    await Corporation_1.CorporationModel.update(corpId, {
                        capital: newCapital,
                        special_dividend_last_paid_at: new Date(),
                        special_dividend_last_amount: dividendAmount,
                    });
                }
            }
            break;
    }
}
/**
 * Get human-readable proposal description
 */
function getProposalDescription(type, data) {
    switch (type) {
        case 'ceo_nomination':
            return `Elect ${data.nominee_name || 'a shareholder'} as CEO`;
        case 'sector_change':
            return `Change sector to ${data.new_sector}`;
        case 'hq_change':
            return `Move HQ to ${data.new_state}`;
        case 'board_size':
            return `Change board size to ${data.new_size} members`;
        case 'appoint_member':
            return `Appoint ${data.appointee_name || 'a shareholder'} to the board`;
        case 'ceo_salary_change':
            return `Change CEO salary to $${data.new_salary.toLocaleString()}/96h`;
        default:
            return 'Unknown proposal';
    }
}
/**
 * Process market revenue/costs for all corporations with business units
 * Called hourly to add net profit to corporation capital
 * Applies 10% boost from active Supply Rush or Marketing Campaign actions
 */
async function processMarketRevenue() {
    try {
        console.log('[Cron] Processing market revenue/costs...');
        // Get all corporations with their hourly financials
        const corpFinancials = await MarketEntry_1.MarketEntryModel.getAllCorporationsFinancials();
        if (corpFinancials.length === 0) {
            console.log('[Cron] No corporations with business units to process');
            return;
        }
        // Get all active corporate actions for performance boost
        const activeActionsQuery = await connection_1.default.query(`
      SELECT DISTINCT corporation_id, action_type
      FROM corporate_actions
      WHERE expires_at > NOW()
    `);
        // Build a map of corporation_id -> set of active action types
        const activeCorporateActions = new Map();
        for (const row of activeActionsQuery.rows) {
            if (!activeCorporateActions.has(row.corporation_id)) {
                activeCorporateActions.set(row.corporation_id, new Set());
            }
            activeCorporateActions.get(row.corporation_id).add(row.action_type);
        }
        let totalProcessed = 0;
        let totalRevenue = 0;
        for (const { corporation_id, hourly_profit } of corpFinancials) {
            if (hourly_profit === 0)
                continue;
            try {
                // Get current corporation capital
                const corp = await Corporation_1.CorporationModel.findById(corporation_id);
                if (!corp)
                    continue;
                const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
                // Apply corporate action boost if active
                let adjustedProfit = hourly_profit;
                const activeActions = activeCorporateActions.get(corporation_id);
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
                    adjustedProfit = hourly_profit * boostMultiplier;
                    console.log(`[Cron] Corporation ${corporation_id} has active corporate actions - boosting profit from $${hourly_profit.toFixed(2)} to $${adjustedProfit.toFixed(2)}${boostDescription}`);
                }
                // Add adjusted hourly profit to capital (can be negative if costs exceed revenue)
                const newCapital = Math.max(0, currentCapital + adjustedProfit);
                await Corporation_1.CorporationModel.update(corporation_id, { capital: newCapital });
                // Record transaction for corporation revenue
                const boostNote = activeActions && activeActions.size > 0 ? ` (with ${activeActions.size} active boost${activeActions.size > 1 ? 's' : ''})` : '';
                await Transaction_1.TransactionModel.create({
                    transaction_type: 'corp_revenue',
                    amount: adjustedProfit,
                    corporation_id: corporation_id,
                    description: `Hourly ${adjustedProfit >= 0 ? 'profit' : 'loss'}: $${Math.abs(adjustedProfit).toLocaleString()}${boostNote}`,
                });
                // Recalculate stock price based on new fundamentals (with hourly random variation)
                const newPrice = await (0, valuation_1.updateStockPrice)(corporation_id, true);
                // Record price history
                await SharePriceHistory_1.SharePriceHistoryModel.create({
                    corporation_id,
                    share_price: newPrice,
                    capital: newCapital,
                });
                totalProcessed++;
                totalRevenue += adjustedProfit;
            }
            catch (corpErr) {
                console.error(`[Cron] Error processing revenue for corporation ${corporation_id}:`, corpErr);
            }
        }
        console.log(`[Cron] Market revenue processed: ${totalProcessed} corporations, total hourly profit: $${totalRevenue.toLocaleString()}`);
    }
    catch (error) {
        console.error('[Cron] Error processing market revenue:', error);
    }
}
/**
 * Process CEO salaries for all corporations
 * Called hourly to pay CEOs from corporation capital
 * Uses corporation's ceo_salary field (per 96h), divided by 96 for hourly rate
 * If corporation can't afford salary, sets ceo_salary to 0
 */
async function processCeoSalaries() {
    try {
        console.log('[Cron] Processing CEO salaries...');
        const corporations = await Corporation_1.CorporationModel.findAll();
        if (corporations.length === 0) {
            console.log('[Cron] No corporations to process for CEO salaries');
            return;
        }
        let totalPaid = 0;
        let ceosPaid = 0;
        let salariesZeroed = 0;
        for (const corp of corporations) {
            if (!corp.ceo_id)
                continue;
            try {
                const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
                const ceoSalaryPer96h = typeof corp.ceo_salary === 'string' ? parseFloat(corp.ceo_salary) : (corp.ceo_salary || DEFAULT_CEO_SALARY_PER_96H);
                // Skip if salary is already 0
                if (ceoSalaryPer96h <= 0)
                    continue;
                const hourlySalary = ceoSalaryPer96h / 96;
                // Check if corporation has enough capital to pay salary
                if (currentCapital < hourlySalary) {
                    console.log(`[Cron] Corporation ${corp.id} (${corp.name}) has insufficient capital for CEO salary - setting salary to $0`);
                    // Set CEO salary to 0 since corporation can't afford it
                    await Corporation_1.CorporationModel.update(corp.id, { ceo_salary: 0 });
                    salariesZeroed++;
                    continue;
                }
                // Deduct salary from corporation capital
                const newCapital = currentCapital - hourlySalary;
                await Corporation_1.CorporationModel.update(corp.id, { capital: newCapital });
                // Add salary to CEO's personal cash
                await User_1.UserModel.updateCash(corp.ceo_id, hourlySalary);
                // Record transaction
                await Transaction_1.TransactionModel.create({
                    transaction_type: 'ceo_salary',
                    amount: hourlySalary,
                    from_user_id: null, // From corporation
                    to_user_id: corp.ceo_id,
                    corporation_id: corp.id,
                    description: `CEO hourly salary from ${corp.name} ($${ceoSalaryPer96h.toLocaleString()}/96h)`,
                });
                ceosPaid++;
                totalPaid += hourlySalary;
            }
            catch (err) {
                console.error(`[Cron] Error paying CEO salary for corporation ${corp.id}:`, err);
            }
        }
        console.log(`[Cron] CEO salaries processed: ${ceosPaid} CEOs paid, total: $${totalPaid.toLocaleString()}, ${salariesZeroed} salaries zeroed`);
    }
    catch (error) {
        console.error('[Cron] Error processing CEO salaries:', error);
    }
}
/**
 * Manual trigger for CEO salary processing
 */
async function triggerCeoSalaries() {
    const corporations = await Corporation_1.CorporationModel.findAll();
    let totalPaid = 0;
    let ceosPaid = 0;
    let salariesZeroed = 0;
    for (const corp of corporations) {
        if (!corp.ceo_id)
            continue;
        const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
        const ceoSalaryPer96h = typeof corp.ceo_salary === 'string' ? parseFloat(corp.ceo_salary) : (corp.ceo_salary || DEFAULT_CEO_SALARY_PER_96H);
        // Skip if salary is already 0
        if (ceoSalaryPer96h <= 0)
            continue;
        const hourlySalary = ceoSalaryPer96h / 96;
        // If can't afford, zero the salary
        if (currentCapital < hourlySalary) {
            await Corporation_1.CorporationModel.update(corp.id, { ceo_salary: 0 });
            salariesZeroed++;
            continue;
        }
        const newCapital = currentCapital - hourlySalary;
        await Corporation_1.CorporationModel.update(corp.id, { capital: newCapital });
        await User_1.UserModel.updateCash(corp.ceo_id, hourlySalary);
        await Transaction_1.TransactionModel.create({
            transaction_type: 'ceo_salary',
            amount: hourlySalary,
            from_user_id: null,
            to_user_id: corp.ceo_id,
            corporation_id: corp.id,
            description: `CEO hourly salary from ${corp.name} ($${ceoSalaryPer96h.toLocaleString()}/96h)`,
        });
        ceosPaid++;
        totalPaid += hourlySalary;
    }
    return { ceosPaid, totalPaid, salariesZeroed };
}
/**
 * Process dividends for all corporations
 * Called hourly to pay dividends from corporation capital based on total profit
 */
async function processDividends() {
    try {
        console.log('[Cron] Processing dividends...');
        // Get all corporations with dividend_percentage > 0
        const corporations = await Corporation_1.CorporationModel.findAll();
        const corpsWithDividends = corporations.filter(corp => {
            const divPercent = typeof corp.dividend_percentage === 'string' ? parseFloat(corp.dividend_percentage) : (corp.dividend_percentage || 0);
            return divPercent > 0;
        });
        if (corpsWithDividends.length === 0) {
            console.log('[Cron] No corporations with dividend percentage set');
            return;
        }
        // Get financials for all corporations
        const corpFinancials = await MarketEntry_1.MarketEntryModel.getAllCorporationsFinancials();
        const financialsMap = new Map(corpFinancials.map(f => [f.corporation_id, f.hourly_profit]));
        let totalPaid = 0;
        let dividendsPaid = 0;
        for (const corp of corpsWithDividends) {
            try {
                const dividendPercentage = typeof corp.dividend_percentage === 'string' ? parseFloat(corp.dividend_percentage) : (corp.dividend_percentage || 0);
                if (dividendPercentage <= 0)
                    continue;
                // Get hourly profit for this corporation (0 if no market entries)
                const hourlyProfit = financialsMap.get(corp.id) || 0;
                // Calculate 96-hour total profit
                const totalProfit96h = hourlyProfit * 96;
                // Calculate hourly dividend: (total_profit * dividend_percentage / 100) / 96
                const hourlyDividend = (totalProfit96h * dividendPercentage / 100) / 96;
                // Skip if no profit or negative
                if (hourlyDividend <= 0)
                    continue;
                // Get all shareholders
                const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corp.id);
                if (shareholders.length === 0)
                    continue;
                // Calculate total shares
                const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
                if (totalShares === 0)
                    continue;
                // Check if corporation has enough capital
                const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
                if (currentCapital < hourlyDividend) {
                    console.log(`[Cron] Corporation ${corp.id} (${corp.name}) has insufficient capital for dividends`);
                    continue;
                }
                // Pay each shareholder
                for (const shareholder of shareholders) {
                    // Calculate shareholder's dividend: (hourly_dividend * shareholder.shares) / total_shares
                    const shareholderDividend = (hourlyDividend * shareholder.shares) / totalShares;
                    // Add dividend to shareholder's cash
                    await User_1.UserModel.updateCash(shareholder.user_id, shareholderDividend);
                    // Record transaction
                    await Transaction_1.TransactionModel.create({
                        transaction_type: 'dividend',
                        amount: shareholderDividend,
                        from_user_id: null, // From corporation
                        to_user_id: shareholder.user_id,
                        corporation_id: corp.id,
                        description: `Regular dividend from ${corp.name}`,
                    });
                }
                // Deduct total dividend from corporation capital
                const newCapital = currentCapital - hourlyDividend;
                await Corporation_1.CorporationModel.update(corp.id, { capital: newCapital });
                dividendsPaid++;
                totalPaid += hourlyDividend;
            }
            catch (err) {
                console.error(`[Cron] Error paying dividends for corporation ${corp.id}:`, err);
            }
        }
        console.log(`[Cron] Dividends processed: ${dividendsPaid} corporations paid, total: $${totalPaid.toLocaleString()}`);
    }
    catch (error) {
        console.error('[Cron] Error processing dividends:', error);
    }
}
/**
 * Manual trigger for dividend processing
 */
async function triggerDividends() {
    const corporations = await Corporation_1.CorporationModel.findAll();
    const corpsWithDividends = corporations.filter(corp => {
        const divPercent = typeof corp.dividend_percentage === 'string' ? parseFloat(corp.dividend_percentage) : (corp.dividend_percentage || 0);
        return divPercent > 0;
    });
    const corpFinancials = await MarketEntry_1.MarketEntryModel.getAllCorporationsFinancials();
    const financialsMap = new Map(corpFinancials.map(f => [f.corporation_id, f.hourly_profit]));
    let totalPaid = 0;
    let dividendsPaid = 0;
    for (const corp of corpsWithDividends) {
        const dividendPercentage = typeof corp.dividend_percentage === 'string' ? parseFloat(corp.dividend_percentage) : (corp.dividend_percentage || 0);
        if (dividendPercentage <= 0)
            continue;
        const hourlyProfit = financialsMap.get(corp.id) || 0;
        const totalProfit96h = hourlyProfit * 96;
        const hourlyDividend = (totalProfit96h * dividendPercentage / 100) / 96;
        if (hourlyDividend <= 0)
            continue;
        const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corp.id);
        if (shareholders.length === 0)
            continue;
        const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
        if (totalShares === 0)
            continue;
        const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
        if (currentCapital < hourlyDividend)
            continue;
        for (const shareholder of shareholders) {
            const shareholderDividend = (hourlyDividend * shareholder.shares) / totalShares;
            await User_1.UserModel.updateCash(shareholder.user_id, shareholderDividend);
            await Transaction_1.TransactionModel.create({
                transaction_type: 'dividend',
                amount: shareholderDividend,
                from_user_id: null,
                to_user_id: shareholder.user_id,
                corporation_id: corp.id,
                description: `Regular dividend from ${corp.name}`,
            });
        }
        const newCapital = currentCapital - hourlyDividend;
        await Corporation_1.CorporationModel.update(corp.id, { capital: newCapital });
        dividendsPaid++;
        totalPaid += hourlyDividend;
    }
    return { dividendsPaid, totalPaid };
}
/**
 * Manual trigger for testing market revenue processing
 */
async function triggerMarketRevenue() {
    const corpFinancials = await MarketEntry_1.MarketEntryModel.getAllCorporationsFinancials();
    let totalProcessed = 0;
    let totalProfit = 0;
    for (const { corporation_id, hourly_profit } of corpFinancials) {
        if (hourly_profit === 0)
            continue;
        const corp = await Corporation_1.CorporationModel.findById(corporation_id);
        if (!corp)
            continue;
        const currentCapital = typeof corp.capital === 'string' ? parseFloat(corp.capital) : corp.capital;
        const newCapital = Math.max(0, currentCapital + hourly_profit);
        await Corporation_1.CorporationModel.update(corporation_id, { capital: newCapital });
        // Record transaction for corporation revenue
        await Transaction_1.TransactionModel.create({
            transaction_type: 'corp_revenue',
            amount: hourly_profit,
            corporation_id: corporation_id,
            description: `Hourly ${hourly_profit >= 0 ? 'profit' : 'loss'}: $${Math.abs(hourly_profit).toLocaleString()}`,
        });
        // Recalculate stock price (with hourly random variation)
        const newPrice = await (0, valuation_1.updateStockPrice)(corporation_id, true);
        // Record price history
        await SharePriceHistory_1.SharePriceHistoryModel.create({
            corporation_id,
            share_price: newPrice,
            capital: newCapital,
        });
        totalProcessed++;
        totalProfit += hourly_profit;
    }
    return { processed: totalProcessed, totalProfit };
}
/**
 * Get next scheduled cron times (for server time footer)
 */
function getNextCronTimes() {
    const now = new Date();
    // Next hourly action update (at :00)
    const nextActionUpdate = new Date(now);
    nextActionUpdate.setMinutes(0, 0, 0);
    nextActionUpdate.setHours(nextActionUpdate.getHours() + 1);
    // Next 5-minute proposal check
    const nextProposalCheck = new Date(now);
    const minutes = nextProposalCheck.getMinutes();
    const nextFiveMin = Math.ceil((minutes + 1) / 5) * 5;
    if (nextFiveMin >= 60) {
        nextProposalCheck.setHours(nextProposalCheck.getHours() + 1);
        nextProposalCheck.setMinutes(0, 0, 0);
    }
    else {
        nextProposalCheck.setMinutes(nextFiveMin, 0, 0);
    }
    return { nextActionUpdate, nextProposalCheck };
}
/**
 * Record commodity and product prices to history
 * Called hourly to track price changes over time
 */
async function recordMarketPrices() {
    try {
        console.log('[Cron] Recording market prices...');
        const { RESOURCES, PRODUCTS, SECTOR_EXTRACTION, SECTOR_RESOURCES, SECTOR_PRODUCTS, SECTOR_PRODUCT_DEMANDS, SECTOR_RETAIL_DEMANDS, SECTOR_SERVICE_DEMANDS, calculateAllCommodityPrices, calculateProductPrice, EXTRACTION_ELECTRICITY_CONSUMPTION, EXTRACTION_OUTPUT_RATE, PRODUCTION_ELECTRICITY_CONSUMPTION, PRODUCTION_PRODUCT_CONSUMPTION, PRODUCTION_RESOURCE_CONSUMPTION, PRODUCTION_OUTPUT_RATE, RETAIL_PRODUCT_CONSUMPTION, SERVICE_ELECTRICITY_CONSUMPTION, SERVICE_PRODUCT_CONSUMPTION, } = await Promise.resolve().then(() => __importStar(require('../constants/sectors')));
        // Get extraction units count by sector
        const extractionQuery = await connection_1.default.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as extraction_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
      GROUP BY me.sector_type
    `);
        const sectorExtractionUnits = {};
        for (const row of extractionQuery.rows) {
            sectorExtractionUnits[row.sector_type] = row.extraction_units || 0;
        }
        // Calculate commodity supply
        const commoditySupply = {};
        for (const resource of RESOURCES) {
            let supply = 0;
            for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
                if (extractableResources && extractableResources.includes(resource)) {
                    const extractionUnits = sectorExtractionUnits[sector] || 0;
                    supply += extractionUnits * EXTRACTION_OUTPUT_RATE;
                }
            }
            commoditySupply[resource] = supply;
        }
        // Get production units count by sector
        const productionQuery = await connection_1.default.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as production_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
      GROUP BY me.sector_type
    `);
        const sectorProductionUnits = {};
        for (const row of productionQuery.rows) {
            sectorProductionUnits[row.sector_type] = row.production_units || 0;
        }
        const retailQuery = await connection_1.default.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as retail_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'retail'
      GROUP BY me.sector_type
    `);
        const sectorRetailUnits = {};
        for (const row of retailQuery.rows) {
            sectorRetailUnits[row.sector_type] = row.retail_units || 0;
        }
        const serviceQuery = await connection_1.default.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as service_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'service'
      GROUP BY me.sector_type
    `);
        const sectorServiceUnits = {};
        for (const row of serviceQuery.rows) {
            sectorServiceUnits[row.sector_type] = row.service_units || 0;
        }
        // Calculate commodity demand
        const commodityDemand = {};
        for (const resource of RESOURCES) {
            let demand = 0;
            for (const [sector, requiredResource] of Object.entries(SECTOR_RESOURCES)) {
                if (requiredResource === resource) {
                    const productionUnits = sectorProductionUnits[sector] || 0;
                    demand += productionUnits * PRODUCTION_RESOURCE_CONSUMPTION;
                }
            }
            commodityDemand[resource] = demand;
        }
        // Calculate and record commodity prices
        const commodities = calculateAllCommodityPrices(commoditySupply, commodityDemand);
        for (const priceData of commodities) {
            await CommodityPriceHistory_1.CommodityPriceHistoryModel.create({
                resource_name: priceData.resource,
                price: priceData.currentPrice,
                supply: priceData.totalSupply,
                demand: commodityDemand[priceData.resource] || 0,
            });
        }
        // Calculate product supply
        const productSupply = {};
        for (const product of PRODUCTS) {
            let supply = 0;
            for (const [sector, producedProduct] of Object.entries(SECTOR_PRODUCTS)) {
                if (producedProduct === product) {
                    supply += (sectorProductionUnits[sector] || 0) * PRODUCTION_OUTPUT_RATE;
                }
            }
            productSupply[product] = supply;
        }
        // Calculate product demand
        const productDemand = {};
        for (const product of PRODUCTS) {
            let demand = 0;
            for (const [sector, demandedProducts] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
                if (demandedProducts && demandedProducts.includes(product)) {
                    demand += (sectorProductionUnits[sector] || 0) * PRODUCTION_PRODUCT_CONSUMPTION;
                }
            }
            for (const [sector, demandedProducts] of Object.entries(SECTOR_RETAIL_DEMANDS)) {
                if (demandedProducts && demandedProducts.includes(product)) {
                    demand += (sectorRetailUnits[sector] || 0) * RETAIL_PRODUCT_CONSUMPTION;
                }
            }
            for (const [sector, demandedProducts] of Object.entries(SECTOR_SERVICE_DEMANDS)) {
                if (demandedProducts && demandedProducts.includes(product)) {
                    const perUnitDemand = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;
                    demand += (sectorServiceUnits[sector] || 0) * perUnitDemand;
                }
            }
            if (product === 'Electricity') {
                for (const productionUnits of Object.values(sectorProductionUnits)) {
                    demand += (productionUnits || 0) * PRODUCTION_ELECTRICITY_CONSUMPTION;
                }
                for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
                    if (extractableResources && extractableResources.length > 0) {
                        demand += (sectorExtractionUnits[sector] || 0) * EXTRACTION_ELECTRICITY_CONSUMPTION;
                    }
                }
            }
            productDemand[product] = demand;
        }
        // Calculate and record product prices
        for (const product of PRODUCTS) {
            const priceData = calculateProductPrice(product, productSupply[product], productDemand[product]);
            await ProductPriceHistory_1.ProductPriceHistoryModel.create({
                product_name: product,
                price: priceData.currentPrice,
                supply: productSupply[product] || 0,
                demand: productDemand[product] || 0,
            });
        }
        console.log(`[Cron] Recorded prices for ${RESOURCES.length} commodities and ${PRODUCTS.length} products`);
    }
    catch (error) {
        console.error('[Cron] Error recording market prices:', error);
    }
}
