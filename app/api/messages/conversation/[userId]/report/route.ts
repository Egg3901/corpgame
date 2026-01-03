
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { ReportedChatModel } from '@/lib/models/ReportedChat';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const reporterId = await getAuthUserId(request);
    if (!reporterId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: userIdParam } = await params;
    const reportedUserId = parseInt(userIdParam, 10);
    if (isNaN(reportedUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (reporterId === reportedUserId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body;

    // Validate reported user exists
    const reportedUser = await UserModel.findById(reportedUserId);
    if (!reportedUser) {
      return NextResponse.json({ error: 'Reported user not found' }, { status: 404 });
    }

    // Validate reason length if provided
    if (reason !== undefined && reason !== null) {
      if (typeof reason !== 'string' || reason.length > 2000) {
        return NextResponse.json({ error: 'Reason cannot exceed 2000 characters' }, { status: 400 });
      }
    }

    const report = await ReportedChatModel.create({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason: reason ? reason.trim() : null,
    });

    return NextResponse.json({
      success: true,
      report_id: report.id,
      message: 'Conversation reported successfully',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Report conversation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to report conversation') }, { status: 500 });
  }
}
