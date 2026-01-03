
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getOptionalAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { BoardModel, BoardProposalModel } from '@/lib/models/BoardProposal';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { UserModel } from '@/lib/models/User';
import { SECTORS, US_STATE_CODES } from '@/lib/constants/sectors';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Get board members
    const boardMembers = await BoardModel.getBoardMembers(corpId);

    // Get effective CEO
    const effectiveCeo = await BoardModel.getEffectiveCeo(corpId);

    // Get active proposals with votes
    const userId = await getOptionalAuthUserId(request);
    const proposals = await BoardProposalModel.getProposalsWithVotes(corpId, userId ?? undefined);
    const activeProposals = proposals.filter(p => p.status === 'active');

    // Get shareholders list (for nominee/appointee selection)
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    
    // Batch fetch user details for shareholders
    const userIds = [...new Set(shareholders.map(sh => sh.user_id))];
    const users = await UserModel.findByIds(userIds);
    const userMap = new Map(users.map(u => [u.id, u]));

    const shareholdersWithUsers = shareholders.map((sh) => {
      const user = userMap.get(sh.user_id);
      return {
        user_id: sh.user_id,
        shares: sh.shares,
        username: user?.username,
        player_name: user?.player_name,
        profile_id: user?.profile_id,
      };
    });

    // Check if current user is on board
    const isOnBoard = userId ? await BoardModel.isOnBoard(corpId, userId) : false;

    // Check if current user is CEO
    const isCeo = effectiveCeo?.userId === userId;

    return NextResponse.json({
      corporation: {
        id: corporation.id,
        name: corporation.name,
        type: corporation.type,
        hq_state: corporation.hq_state,
        board_size: corporation.board_size || 3,
        elected_ceo_id: corporation.elected_ceo_id,
        ceo_salary: corporation.ceo_salary || 100000,
        dividend_percentage: corporation.dividend_percentage || 0,
        special_dividend_last_paid_at: corporation.special_dividend_last_paid_at,
        special_dividend_last_amount: corporation.special_dividend_last_amount,
        focus: corporation.focus || 'diversified',
      },
      board_members: boardMembers.map(m => ({
        ...m,
        profile_image_url: normalizeImageUrl(m.profile_image_url),
      })),
      effective_ceo: effectiveCeo,
      active_proposals: activeProposals,
      shareholders: shareholdersWithUsers,
      is_on_board: isOnBoard,
      is_ceo: isCeo,
      sectors: SECTORS,
      us_states: US_STATE_CODES,
    });
  } catch (error: unknown) {
    console.error('Get board error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch board data') }, { status: 500 });
  }
}
