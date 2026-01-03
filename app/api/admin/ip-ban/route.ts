import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { BannedIpModel } from '@/lib/models/BannedIp';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ip, reason } = await req.json();
    if (!ip || typeof ip !== 'string') {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    await BannedIpModel.banIp(ip, reason || null, userId);
    await UserModel.banUsersByIp(BannedIpModel.normalize(ip), reason || null, userId);

    return NextResponse.json({ message: `IP ${ip} banned` });
  } catch (error: unknown) {
    console.error('Ban IP error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to ban IP') }, { status: 500 });
  }
}
