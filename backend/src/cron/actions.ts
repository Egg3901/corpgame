import cron from 'node-cron';
import { UserModel } from '../models/User';
import { CorporationModel } from '../models/Corporation';
import { BoardProposalModel, BoardVoteModel, BoardModel } from '../models/BoardProposal';
import { MessageModel } from '../models/Message';

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

  // Run every 5 minutes to check for expired proposals
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Running proposal resolution check...');
    
    try {
      const expiredProposals = await BoardProposalModel.getExpiredActiveProposals();
      
      if (expiredProposals.length === 0) {
        console.log('[Cron] No expired proposals to resolve');
        return;
      }

      console.log(`[Cron] Found ${expiredProposals.length} expired proposals to resolve`);

      for (const proposal of expiredProposals) {
        try {
          await resolveExpiredProposal(proposal);
          console.log(`[Cron] Resolved proposal ${proposal.id}`);
        } catch (err) {
          console.error(`[Cron] Error resolving proposal ${proposal.id}:`, err);
        }
      }
    } catch (error) {
      console.error('[Cron] Error in proposal resolution:', error);
    }
  });

  console.log('[Cron] Proposal resolution cron job scheduled (runs every 5 minutes)');
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

/**
 * Resolve an expired proposal
 */
async function resolveExpiredProposal(proposal: any): Promise<void> {
  const voteCounts = await BoardVoteModel.getVoteCounts(proposal.id);
  const passed = voteCounts.aye > voteCounts.nay;

  // Update proposal status
  await BoardProposalModel.updateStatus(proposal.id, passed ? 'passed' : 'failed');

  if (passed) {
    // Apply the changes
    await applyProposalChanges(proposal);
  }

  // Notify board members of outcome (use proposer as sender, skip self-messages)
  const boardMembers = await BoardModel.getBoardMembers(proposal.corporation_id);
  const corporation = await CorporationModel.findById(proposal.corporation_id);
  const proposalDescription = getProposalDescription(proposal.proposal_type, proposal.proposal_data);
  const senderId = proposal.proposer_id;

  for (const member of boardMembers) {
    // Skip sending to the proposer (they already know, and self-messaging is not allowed)
    if (member.user_id === senderId) continue;

    try {
      await MessageModel.create({
        sender_id: senderId,
        recipient_id: member.user_id,
        subject: `Vote Result: ${corporation?.name || 'Corporation'}`,
        body: `The proposal "${proposalDescription}" has ${passed ? 'PASSED' : 'FAILED'}.\n\nVotes: ${voteCounts.aye} Aye, ${voteCounts.nay} Nay`,
      });
    } catch (msgErr) {
      console.warn(`[Cron] Failed to send vote notification to user ${member.user_id}:`, msgErr);
    }
  }
}

/**
 * Apply changes from a passed proposal
 */
async function applyProposalChanges(proposal: any): Promise<void> {
  const corpId = proposal.corporation_id;
  const data = proposal.proposal_data;

  switch (proposal.proposal_type) {
    case 'ceo_nomination':
      await CorporationModel.setElectedCeo(corpId, data.nominee_id);
      break;

    case 'sector_change':
      await CorporationModel.update(corpId, { type: data.new_sector });
      break;

    case 'hq_change':
      await CorporationModel.update(corpId, { hq_state: data.new_state });
      break;

    case 'board_size':
      await CorporationModel.update(corpId, { board_size: data.new_size });
      break;

    case 'appoint_member':
      // Appoint member increases board_size by 1
      const corp = await CorporationModel.findById(corpId);
      if (corp && corp.board_size < 7) {
        await CorporationModel.update(corpId, { board_size: corp.board_size + 1 });
      }
      break;
  }
}

/**
 * Get human-readable proposal description
 */
function getProposalDescription(type: string, data: any): string {
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
    default:
      return 'Unknown proposal';
  }
}

/**
 * Get next scheduled cron times (for server time footer)
 */
export function getNextCronTimes(): {
  nextActionUpdate: Date;
  nextProposalCheck: Date;
} {
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
  } else {
    nextProposalCheck.setMinutes(nextFiveMin, 0, 0);
  }
  
  return { nextActionUpdate, nextProposalCheck };
}
