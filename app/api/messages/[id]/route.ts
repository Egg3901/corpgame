
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = parseInt(params.id, 10);
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if user is sender or recipient
    if (message.sender_id !== userId && message.recipient_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If user is recipient and message is unread, mark as read
    if (message.recipient_id === userId && !message.read) {
      await MessageModel.markAsRead(messageId, userId);
      message.read = true;
    }

    // Fetch sender and recipient details
    const sender = await UserModel.findById(message.sender_id);
    const recipient = await UserModel.findById(message.recipient_id);

    const messageWithUsers = {
      ...message,
      sender: sender ? {
        id: sender.id,
        profile_id: sender.profile_id,
        username: sender.username,
        player_name: sender.player_name,
        profile_image_url: normalizeImageUrl(sender.profile_image_url),
      } : null,
      recipient: recipient ? {
        id: recipient.id,
        profile_id: recipient.profile_id,
        username: recipient.username,
        player_name: recipient.player_name,
        profile_image_url: normalizeImageUrl(recipient.profile_image_url),
      } : null,
    };

    return NextResponse.json(messageWithUsers);
  } catch (error: unknown) {
    console.error('Get message error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch message') }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = parseInt(params.id, 10);
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    const deleted = await MessageModel.delete(messageId, userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete message') }, { status: 500 });
  }
}
