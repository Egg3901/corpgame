
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { BoardProposalModel, BoardVoteModel, BoardModel } from '@/lib/models/BoardProposal';
import { getErrorMessage } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ corpId: string; proposalId: string }> }
) {
  try {
    const { corpId: corpIdParam, proposalId: proposalIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    const proposalId = parseInt(proposalIdParam, 10);
    if (isNaN(corpId) || isNaN(proposalId)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vote } = body;

    if (!vote || !['aye', 'nay'].includes(vote)) {
      return NextResponse.json({ error: 'Vote must be "aye" or "nay"' }, { status: 400 });
    }

    // Verify proposal exists and is active
    const proposal = await BoardProposalModel.findById(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.corporation_id !== corpId) {
      return NextResponse.json({ error: 'Proposal does not belong to this corporation' }, { status: 400 });
    }
    if (proposal.status !== 'active') {
      return NextResponse.json({ error: 'This proposal is no longer active' }, { status: 400 });
    }

    // Verify user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return NextResponse.json({ error: 'Only board members can vote' }, { status: 403 });
    }

    // Cast the vote
    const boardVote = await BoardVoteModel.castVote(proposalId, userId, vote);

    // Get current vote counts and board size
    const voteCounts = await BoardVoteModel.getVoteCounts(proposalId);
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const boardSize = boardMembers.length;
    const majorityNeeded = Math.floor(boardSize / 2) + 1;

    // Check if supermajority is reached (autopass/autofail)
    let resolved = false;
    if (voteCounts.aye >= majorityNeeded) {
      // Majority voted aye - auto-pass
      await BoardProposalModel.resolve(proposalId);
      resolved = true;
    } else if (voteCounts.nay >= majorityNeeded) {
      // Majority voted nay - auto-fail
      await BoardProposalModel.resolve(proposalId);
      resolved = true;
    } else {
      // Check if all board members have voted - if so, resolve immediately
      const allVoted = await BoardModel.haveAllBoardMembersVoted(proposalId, corpId);
      if (allVoted) {
        await BoardProposalModel.resolve(proposalId);
        resolved = true;
      }
    }

    // If resolved, re-fetch updated vote counts (though they shouldn't change, status will)
    const finalVoteCounts = await BoardVoteModel.getVoteCounts(proposalId);

    return NextResponse.json({
      vote: boardVote,
      votes: finalVoteCounts,
      resolved,
    });
  } catch (error: unknown) {
    console.error('Cast vote error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to cast vote') }, { status: 500 });
  }
}
