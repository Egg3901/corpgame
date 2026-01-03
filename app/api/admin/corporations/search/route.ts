import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { CorporationModel } from '@/lib/models/Corporation';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      // Return all corporations if no query
      const allCorps = await CorporationModel.findAll();
      const results = allCorps.slice(0, 50).map(corp => ({
        id: corp.id,
        name: corp.name,
        sector: corp.focus || corp.type || 'General',
        logo: corp.logo || null,
      }));
      return NextResponse.json(results);
    }

    // Search by name (case-insensitive)
    const allCorps = await CorporationModel.search(query, 20);
    
    const results = allCorps.map(corp => ({
        id: corp.id,
        name: corp.name,
        sector: corp.focus || corp.type || 'General',
        logo: corp.logo || null,
      }));

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Search corporations error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to search corporations') }, { status: 500 });
  }
}
