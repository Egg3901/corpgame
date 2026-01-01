import { NextRequest, NextResponse } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { UserModel } from '@/lib/models/User';
import { connectMongo } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';
import { RefreshTokenSchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    
    // Zod validation
    const validated = RefreshTokenSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { refreshToken } = validated.data;

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err: unknown) {
      return NextResponse.json({ error: getErrorMessage(err) }, { status: 401 });
    }

    // Check if user still exists and is valid
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: 'Account is banned' }, { status: 403 });
    }

    // Rotate refresh token (optional security practice, but good)
    // We issue a new access token AND a new refresh token
    const tokenPayload = { userId: user.id, email: user.email, username: user.username, is_admin: user.is_admin };
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    return NextResponse.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error, 'Internal server error');
    console.error('Refresh token error:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
