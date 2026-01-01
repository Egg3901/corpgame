import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporateActionModel } from '@/lib/models/CorporateAction';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { corporationId: string } }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporationId = parseInt(params.corporationId, 10);
    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const actions = await CorporateActionModel.findAllActiveActions(corporationId);
    return NextResponse.json(actions);
  } catch (error: unknown) {
    console.error('Get active corporate actions error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch active corporate actions') }, { status: 500 });
  }
}
