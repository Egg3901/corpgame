import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { resetGameTime } from '@/lib/utils/gameTime';
import { getErrorMessage } from '@/lib/utils';
import { connectMongo } from '@/lib/db/mongo';

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

    const body = await req.json();
    const { year, quarter } = body;

    if (!year || !quarter) {
      return NextResponse.json(
        { error: 'Year and quarter are required' },
        { status: 400 }
      );
    }

    const parsedYear = parseInt(String(year), 10);
    const parsedQuarter = parseInt(String(quarter), 10);

    if (isNaN(parsedYear) || parsedYear < 1900) {
      return NextResponse.json(
        { error: 'Invalid year - must be >= 1900' },
        { status: 400 }
      );
    }

    if (isNaN(parsedQuarter) || parsedQuarter < 1 || parsedQuarter > 4) {
      return NextResponse.json(
        { error: 'Invalid quarter - must be 1-4' },
        { status: 400 }
      );
    }

    const result = await resetGameTime(parsedYear, parsedQuarter);

    return NextResponse.json({
      success: true,
      message: `Game time set to Q${result.gameTime.quarter} ${result.gameTime.year}`,
      game_time: {
        year: result.gameTime.year,
        quarter: result.gameTime.quarter,
      },
      game_start_date: result.gameStartDate.toISOString(),
      quarters_from_start: result.quartersFromStart,
    });
  } catch (error: unknown) {
    console.error('Set game time error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to set game time') },
      { status: 500 }
    );
  }
}
