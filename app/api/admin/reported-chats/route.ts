import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { ReportedChatModel } from '@/lib/models/ReportedChat';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const includeReviewed = searchParams.get('includeReviewed') === 'true';

    const reports = await ReportedChatModel.findAll(includeReviewed);

    // Sanitize user objects in reports if necessary, though findAll already does a lookup
    // The current implementation of findAll returns objects with user details directly
    // Let's verify what findAll returns. It returns ReportedChatWithUsers.
    
    return NextResponse.json(reports);
  } catch (error: unknown) {
    console.error('Get reported chats error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get reported chats') }, { status: 500 });
  }
}
