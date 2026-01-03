import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { BoardMessageModel } from '@/lib/models/BoardMessage';
import { BoardModel } from '@/lib/models/BoardProposal';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messageId = parseInt(id, 10);
    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await BoardMessageModel.findById(messageId);
    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check permissions: Sender, CEO, or Admin
    const user = await UserModel.findById(userId);
    const isAdmin = user?.is_admin;
    const isSender = message.user_id === userId;
    
    // Check if CEO
    const ceoInfo = await BoardModel.getEffectiveCeo(message.corporation_id);
    const isCeo = ceoInfo?.userId === userId;

    if (!isSender && !isCeo && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await BoardMessageModel.delete(messageId);

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error: unknown) {
    console.error('Delete board message error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete message') }, { status: 500 });
  }
}
