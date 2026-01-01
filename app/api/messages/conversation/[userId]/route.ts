
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const otherUserId = parseInt(params.userId, 10);
    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const messages = await MessageModel.findConversation(userId, otherUserId, limit, offset);
    return NextResponse.json(messages);
  } catch (error: unknown) {
    console.error('Get conversation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch conversation') }, { status: 500 });
  }
}
