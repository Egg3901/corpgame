import { NextResponse } from 'next/server';
import { getGameStartDate, calculateGameTimeFromStart, calculateTimeUntilNextQuarter, calculateTimeUntilNextAction } from '@/lib/utils/gameTime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startDate = getGameStartDate();
  const now = new Date();
  const gameTime = calculateGameTimeFromStart(startDate, now);
  // Next quarter is useful for game world progression (quarters/years)
  const nextQuarter = calculateTimeUntilNextQuarter(startDate, now);
  // Next action is useful for user action generation (hourly)
  const nextAction = calculateTimeUntilNextAction(startDate, now);
  
  // Proposal checks happen every 24 hours (example logic, adjust as needed)
  // For now, let's sync it with action update or just give it a dummy value if not implemented
  // Assuming proposals check daily at midnight or similar.
  // Let's just set it to next action update for now to avoid NaNs.
  const nextProposalCheck = nextQuarter.nextUpdate; 
  const secondsUntilProposalCheck = nextQuarter.seconds;

  return NextResponse.json({
    server_time: now.toISOString(),
    game_start_date: startDate.toISOString(),
    next_action_update: nextAction.nextUpdate.toISOString(),
    next_proposal_check: nextProposalCheck.toISOString(),
    seconds_until_action_update: nextAction.seconds,
    seconds_until_proposal_check: secondsUntilProposalCheck,
    // Include the calculated game time components as well if needed by other components, 
    // though ServerTimeResponse doesn't strictly list them, extra fields are fine.
    year: gameTime.year,
    quarter: gameTime.quarter
  });
}
