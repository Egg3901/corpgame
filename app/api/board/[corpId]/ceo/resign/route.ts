
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { BoardModel } from '@/lib/models/BoardProposal';
import { MessageModel } from '@/lib/models/Message';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { corpId: string } }
) {
  try {
    const corpId = parseInt(params.corpId, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Only the elected CEO can resign
    if (corporation.elected_ceo_id !== userId) {
      return NextResponse.json({ error: 'Only the elected CEO can resign' }, { status: 403 });
    }

    // Clear the elected CEO
    await CorporationModel.clearElectedCeo(corpId);

    // Notify board members (system message)
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const ceo = await UserModel.findById(userId);
    const ceoName = ceo?.player_name || ceo?.username || 'The CEO';

    for (const member of boardMembers) {
      await MessageModel.create({
        sender_id: 1, // System user ID
        recipient_id: member.user_id,
        subject: `CEO Resignation: ${corporation.name}`,
        body: `${ceoName} has resigned as CEO of ${corporation.name}. The largest shareholder will serve as Acting CEO until a new CEO is elected by the board.`,
      });
    }

    return NextResponse.json({ success: true, message: 'Successfully resigned as CEO' });
  } catch (error: unknown) {
    console.error('CEO resign error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to resign') }, { status: 500 });
  }
}
