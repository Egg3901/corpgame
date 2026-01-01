import { NextResponse } from 'next/server';
import { getGameStartDate, calculateGameTimeFromStart } from '@/lib/utils/gameTime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startDate = getGameStartDate();
  const gameTime = calculateGameTimeFromStart(startDate);
  
  return NextResponse.json({
    gameTime,
    status: 'active',
    version: '1.0.0'
  });
}
