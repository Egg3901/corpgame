import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: 'You cannot toggle your own admin status' }, { status: 400 });
    }

    const updatedUser = await UserModel.toggleAdminStatus(targetUserId);

    return NextResponse.json({ 
      message: `User admin status toggled to ${updatedUser.is_admin}`,
      is_admin: updatedUser.is_admin 
    });
  } catch (error: unknown) {
    console.error('Toggle admin status error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to toggle admin status') }, { status: 500 });
  }
}
