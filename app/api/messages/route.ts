
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MessageModel } from '@/lib/models/Message';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const includeRead = searchParams.get('include_read') !== 'false';

    let messages;

    if (type === 'sent') {
      messages = await MessageModel.findBySenderId(userId, limit, offset);
    } else if (type === 'conversations') {
      const conversations = await MessageModel.getUserConversations(userId);
      return NextResponse.json(conversations);
    } else {
      // Default: received messages
      messages = await MessageModel.findByRecipientId(userId, limit, offset, includeRead);
    }

    return NextResponse.json(messages);
  } catch (error: unknown) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch messages') }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id, subject, body: messageBody } = body;

    if (!recipient_id || !messageBody) {
      return NextResponse.json({ error: 'recipient_id and body are required' }, { status: 400 });
    }

    // Handle string/number recipient_id
    const recipientId = typeof recipient_id === 'string' ? parseInt(recipient_id, 10) : recipient_id;

    if (isNaN(recipientId)) {
      return NextResponse.json({ error: 'Invalid recipient_id' }, { status: 400 });
    }

    if (userId === recipientId) {
      return NextResponse.json({ error: 'Cannot send message to yourself' }, { status: 400 });
    }

    // Validate recipient exists
    const recipient = await UserModel.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Validate body length
    if (typeof messageBody !== 'string' || messageBody.trim().length === 0) {
      return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 });
    }

    if (messageBody.length > 10000) {
      return NextResponse.json({ error: 'Message body cannot exceed 10000 characters' }, { status: 400 });
    }

    // Validate subject length if provided
    if (subject !== undefined && subject !== null) {
      if (typeof subject !== 'string' || subject.length > 255) {
        return NextResponse.json({ error: 'Subject cannot exceed 255 characters' }, { status: 400 });
      }
    }

    const message = await MessageModel.create({
      sender_id: userId,
      recipient_id: recipientId,
      subject: subject || null,
      body: messageBody.trim(),
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error: unknown) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to send message') }, { status: 500 });
  }
}
