import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

// Temporarily simplified for debugging
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({
      received: true,
      username: body.username,
      debug: 'minimal route working'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to parse body' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'login route exists', method: 'GET' });
}
