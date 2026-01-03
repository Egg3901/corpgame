import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { ReportedChatModel } from '@/lib/models/ReportedChat';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const reportId = parseInt(id, 10);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    await ReportedChatModel.resolve(reportId, userId);

    return NextResponse.json({ message: 'Report resolved' });
  } catch (error: unknown) {
    console.error('Resolve report error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to resolve report') }, { status: 500 });
  }
}
