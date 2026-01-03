import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { GameSettingsModel } from '@/lib/models/GameSettings';
import { getErrorMessage } from '@/lib/utils';
import { connectMongo } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const enabled = await GameSettingsModel.isCronEnabled();
    return NextResponse.json({ enabled });
  } catch (error: unknown) {
    console.error('Cron status error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get cron status') }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { enabled } = await req.json();
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    await GameSettingsModel.setCronEnabled(enabled);
    console.log(`[Admin] Cron ${enabled ? 'enabled' : 'disabled'} by user ${userId}`);

    return NextResponse.json({ enabled });
  } catch (error: unknown) {
    console.error('Cron status update error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update cron status') }, { status: 500 });
  }
}
