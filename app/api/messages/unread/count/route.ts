
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { connectMongo } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await MessageModel.getUnreadCount(userId);
    return NextResponse.json({ count });
  } catch (error: unknown) {
    console.error('Get unread count error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get unread count') }, { status: 500 });
  }
}
