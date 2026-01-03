
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { getErrorMessage } from '@/lib/utils';

export async function PATCH(
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

    await MessageModel.markAllAsRead(userId, otherUserId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Mark conversation as read error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to mark conversation as read') }, { status: 500 });
  }
}
