
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId, getOptionalAuthUserId } from '@/lib/auth';
import { BoardProposalModel, BoardModel, ProposalType, ProposalData } from '@/lib/models/BoardProposal';
import { CorporationModel } from '@/lib/models/Corporation';
import { UserModel } from '@/lib/models/User';
import { MessageModel } from '@/lib/models/Message';
import { isValidSector, isValidStateCode } from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const userId = await getOptionalAuthUserId(request);
    const proposals = await BoardProposalModel.getProposalsWithVotes(corpId, userId ?? undefined);

    return NextResponse.json(proposals);
  } catch (error: unknown) {
    console.error('Get proposals error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch proposals') }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { proposal_type, proposal_data } = body;

    // Verify corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Verify user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return NextResponse.json({ error: 'Only board members can create proposals' }, { status: 403 });
    }

    // Validate proposal type
    const validTypes: ProposalType[] = ['ceo_nomination', 'sector_change', 'hq_change', 'board_size', 'appoint_member', 'ceo_salary_change', 'dividend_change', 'special_dividend', 'stock_split', 'focus_change'];
    if (!validTypes.includes(proposal_type)) {
      return NextResponse.json({ error: 'Invalid proposal type' }, { status: 400 });
    }

    // Validate proposal data based on type
    let validatedData: ProposalData;

    switch (proposal_type) {
      case 'ceo_nomination': {
        const nomineeId = proposal_data.nominee_id;
        if (!nomineeId || typeof nomineeId !== 'number') {
          return NextResponse.json({ error: 'Nominee ID is required' }, { status: 400 });
        }
        // Verify nominee is a shareholder
        const isShareholder = await BoardModel.isShareholder(corpId, nomineeId);
        if (!isShareholder) {
          return NextResponse.json({ error: 'CEO nominee must be a shareholder' }, { status: 400 });
        }
        const nominee = await UserModel.findById(nomineeId);
        validatedData = { 
          nominee_id: nomineeId,
          nominee_name: nominee?.player_name || nominee?.username || 'Unknown',
        };
        break;
      }

      case 'sector_change': {
        const newSector = proposal_data.new_sector;
        if (!newSector || !isValidSector(newSector)) {
          return NextResponse.json({ error: 'Invalid sector. Must be from predefined list.' }, { status: 400 });
        }
        validatedData = { new_sector: newSector };
        break;
      }

      case 'hq_change': {
        const newState = proposal_data.new_state;
        if (!newState || !isValidStateCode(newState)) {
          return NextResponse.json({ error: 'Invalid state code' }, { status: 400 });
        }
        validatedData = { new_state: newState };
        break;
      }

      case 'board_size': {
        const newSize = proposal_data.new_size;
        if (!newSize || typeof newSize !== 'number' || newSize < 3 || newSize > 7) {
          return NextResponse.json({ error: 'Board size must be between 3 and 7' }, { status: 400 });
        }
        validatedData = { new_size: newSize };
        break;
      }

      case 'appoint_member': {
        const appointeeId = proposal_data.appointee_id;
        if (!appointeeId || typeof appointeeId !== 'number') {
          return NextResponse.json({ error: 'Appointee ID is required' }, { status: 400 });
        }
        // Verify appointee is a shareholder
        const isShareholder = await BoardModel.isShareholder(corpId, appointeeId);
        if (!isShareholder) {
          return NextResponse.json({ error: 'Appointee must be a shareholder' }, { status: 400 });
        }
        const appointee = await UserModel.findById(appointeeId);
        validatedData = { 
          appointee_id: appointeeId,
          appointee_name: appointee?.player_name || appointee?.username || 'Unknown',
        };
        break;
      }

      case 'ceo_salary_change': {
        const newSalary = proposal_data.new_salary;
        if (newSalary === undefined || typeof newSalary !== 'number' || newSalary < 0) {
          return NextResponse.json({ error: 'New salary must be a non-negative number' }, { status: 400 });
        }
        // Cap at $10 million per 96h
        if (newSalary > 10000000) {
          return NextResponse.json({ error: 'CEO salary cannot exceed $10,000,000 per 96 hours' }, { status: 400 });
        }
        validatedData = { new_salary: newSalary };
        break;
      }

      case 'dividend_change': {
        const newPercentage = proposal_data.new_percentage;
        if (newPercentage === undefined || typeof newPercentage !== 'number' || newPercentage < 0 || newPercentage > 100) {
          return NextResponse.json({ error: 'Dividend percentage must be between 0 and 100' }, { status: 400 });
        }
        validatedData = { new_percentage: newPercentage };
        break;
      }

      case 'special_dividend': {
        const capitalPercentage = proposal_data.capital_percentage;
        if (capitalPercentage === undefined || typeof capitalPercentage !== 'number' || capitalPercentage < 0 || capitalPercentage > 100) {
          return NextResponse.json({ error: 'Capital percentage must be between 0 and 100' }, { status: 400 });
        }
        
        // Check if 96 hours have passed since last special dividend
        const corp = await CorporationModel.findById(corpId);
        if (corp?.special_dividend_last_paid_at) {
          const lastPaid = new Date(corp.special_dividend_last_paid_at);
          const now = new Date();
          const hoursSinceLast = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 96) {
            const hoursRemaining = Math.ceil(96 - hoursSinceLast);
            return NextResponse.json({ 
              error: `Special dividend can only be paid once every 96 hours. ${hoursRemaining} hours remaining.` 
            }, { status: 400 });
          }
        }
        
        validatedData = { capital_percentage: capitalPercentage };
        break;
      }

      case 'stock_split': {
        // Stock split doubles all shares (2:1 split)
        // No additional data needed
        validatedData = {};
        break;
      }

      case 'focus_change': {
        const newFocus = proposal_data.new_focus;
        const validFocuses = ['extraction', 'production', 'retail', 'service', 'diversified'];
        if (!newFocus || !validFocuses.includes(newFocus)) {
          return NextResponse.json({ error: 'Invalid focus type. Must be extraction, production, retail, service, or diversified.' }, { status: 400 });
        }
        validatedData = { new_focus: newFocus };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid proposal type' }, { status: 400 });
    }

    // Create the proposal
    const proposal = await BoardProposalModel.create(corpId, userId, proposal_type, validatedData);

    // Send notifications to board members (system message)
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const proposer = await UserModel.findById(userId);
    const proposerName = proposer?.player_name || proposer?.username || 'A board member';

    const proposalDescription = BoardProposalModel.getProposalDescription(proposal_type, validatedData);

    for (const member of boardMembers) {
      await MessageModel.create({
        sender_id: 1, // System user ID
        recipient_id: member.user_id,
        subject: `New Board Proposal: ${corporation.name}`,
        body: `${proposerName} has proposed: ${proposalDescription}\n\nThis vote will expire in 12 hours. Please visit the corporation board page to cast your vote.`,
      });
    }

    return NextResponse.json(proposal, { status: 201 });
  } catch (error: unknown) {
    console.error('Create proposal error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create proposal') }, { status: 500 });
  }
}
