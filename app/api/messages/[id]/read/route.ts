import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { getErrorMessage } from '@/lib/utils';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const messageId = parseInt(id, 10);
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Check if message belongs to user
    const message = await MessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.recipient_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await MessageModel.markAsRead(messageId, userId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Mark message as read error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to mark message as read') }, { status: 500 });
  }
}
