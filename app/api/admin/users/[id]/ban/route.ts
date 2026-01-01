import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await UserModel.findById(userId);
    if (!adminUser || !adminUser.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = parseInt(params.id, 10);
    
    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (userId === targetUserId) {
      return NextResponse.json({ error: 'You cannot ban yourself' }, { status: 400 });
    }

    const { reason } = await req.json();
    await UserModel.banUser(targetUserId, reason || null, userId);

    return NextResponse.json({ message: 'User banned' });
  } catch (error: unknown) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to ban user') }, { status: 500 });
  }
}
