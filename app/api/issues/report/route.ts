import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { IssueModel } from '@/lib/models/Issue';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, description } = body;

    if (!type || !description) {
      return NextResponse.json({ error: 'Type and description are required' }, { status: 400 });
    }

    const issue = await IssueModel.create(userId, type, description);

    return NextResponse.json({ message: 'Issue reported successfully', issue });
  } catch (error: unknown) {
    console.error('Report issue error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to report issue') }, { status: 500 });
  }
}
