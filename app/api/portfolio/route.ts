import { NextRequest, NextResponse } from 'next/server';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { CorporationModel } from '@/lib/models/Corporation';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { TransactionModel } from '@/lib/models/Transaction';

export async function GET(req: NextRequest) {
  // Use URL params instead of route params since we are in /api/portfolio
  // The route should probably be /api/portfolio/[userId] but the legacy code was /api/portfolio/:userId
  // However, in Next.js App Router, we should use dynamic routes if we want to capture the ID.
  // Wait, the legacy route was /api/portfolio/:userId.
  // So I should have created app/api/portfolio/[userId]/route.ts.
  // But I created app/api/portfolio/route.ts in my thought process.
  // Let me check my directory creation.
  // I created `app/api/portfolio`. I should create `app/api/portfolio/[userId]` directory if I want to match exactly.
  // But wait, usually portfolio is for the logged in user, or maybe public?
  // The legacy code says `router.get('/:userId', ...)`
  // So I need to create `app/api/portfolio/[userId]/route.ts`.
  // I will do that instead of `app/api/portfolio/route.ts`.
  return NextResponse.json({ error: 'Please use /api/portfolio/[userId]' }, { status: 404 });
}
