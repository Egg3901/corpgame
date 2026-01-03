import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { BoardModel } from '@/lib/models/Board';
import { BoardMessageModel } from '@/lib/models/BoardMessage';
import { CorporationModel } from '@/lib/models/Corporation';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Check if user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return NextResponse.json({ error: 'Only board members can view messages' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const messages = await BoardMessageModel.findByCorporationId(corpId, limit, offset);

    return NextResponse.json(messages);
  } catch (error: unknown) {
    console.error('Get board messages error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch messages') }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Check if user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return NextResponse.json({ error: 'Only board members can post messages' }, { status: 403 });
    }

    const newMessage = await BoardMessageModel.create(corpId, userId, message.trim());

    // Return the message with user details (we need to fetch it again or construct it)
    // Fetching is safer to match GET response structure
    const messages = await BoardMessageModel.findByCorporationId(corpId, 1, 0);
    const createdMessage = messages.find(m => m.id === newMessage.id) || newMessage;

    return NextResponse.json(createdMessage);
  } catch (error: unknown) {
    console.error('Post board message error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to post message') }, { status: 500 });
  }
}
