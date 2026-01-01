import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel, UpdateCorporationData } from '@/lib/models/Corporation';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { isValidSector, isValidCorpFocus, SECTORS, CORP_FOCUS_TYPES, CorpFocus } from '@/lib/constants/sectors';
import { ACTIONS_CONFIG } from '@/lib/constants/actions';
import { getDb } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';
import { UpdateCorporationSchema } from '@/lib/validations/corporations';

interface CorporationUser {
  id: number;
  profile_id: number;
  username: string;
  player_name?: string;
  profile_slug: string;
  profile_image_url?: string | null;
}

// Helper to check if user is CEO
async function isCeo(corporationId: number, userId: number): Promise<boolean> {
  const corp = await CorporationModel.findById(corporationId);
  return corp?.ceo_id === userId;
}

// GET /api/corporation/:id - Get corporation details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const corporation = await CorporationModel.findById(id);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Get shareholders
    const shareholders = await ShareholderModel.findByCorporationId(id);

    // Batch fetch all users (shareholders + CEO)
    const userIds = Array.from(new Set([...shareholders.map(sh => sh.user_id), corporation.ceo_id]));
    let userMap = new Map<number, CorporationUser>();
    
    if (userIds.length > 0) {
      const db = getDb();
      const users = await db.collection('users').find({
        id: { $in: userIds }
      }, {
        projection: {
          id: 1, profile_id: 1, username: 1, player_name: 1,
          profile_slug: 1, profile_image_url: 1
        }
      }).toArray();

      for (const user of users) {
        userMap.set(user.id, {
          id: user.id,
          profile_id: user.profile_id,
          username: user.username,
          player_name: user.player_name,
          profile_slug: user.profile_slug,
          profile_image_url: normalizeImageUrl(user.profile_image_url),
        });
      }
    }

    // Build shareholders with user details
    const shareholdersWithUsers = shareholders.map((sh) => ({
      ...sh,
      user: userMap.get(sh.user_id) || null,
    }));

    const ceo = userMap.get(corporation.ceo_id);

    return NextResponse.json({
      ...corporation,
      logo: normalizeImageUrl(corporation.logo),
      ceo: ceo || null,
      shareholders: shareholdersWithUsers,
    });
  } catch (error: unknown) {
    console.error('Get corporation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch corporation') }, { status: 500 });
  }
}

// PATCH /api/corporation/:id - Update corporation
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const ceoCheck = await isCeo(id, userId);
    if (!ceoCheck) {
      return NextResponse.json({ error: 'Only the CEO can update the corporation' }, { status: 403 });
    }

    const body = await request.json();
    
    // Zod validation (only validates supported fields)
    const validated = UpdateCorporationSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updates: UpdateCorporationData = {};

    // Handle name change
    if (validated.data.name !== undefined) {
      const corporation = await CorporationModel.findById(id);
      if (!corporation) {
        return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
      }

      const newName = validated.data.name;
      if (newName !== corporation.name) {
        const requiredActions = ACTIONS_CONFIG.COSTS.NAME_CHANGE;
        
        // Check if user is admin (admins bypass action cost)
        if (!user.is_admin) {
          const currentActions = await UserModel.getActions(userId);
          if (currentActions < requiredActions) {
            return NextResponse.json({ 
              error: `Changing corporation name requires ${requiredActions} actions. You have ${currentActions} actions.`,
              actions_required: requiredActions,
              actions_available: currentActions
            }, { status: 400 });
          }
          
          // Deduct actions
          await UserModel.updateActions(userId, -requiredActions);
        }
        
        updates.name = newName;
      }
    }

    // Manual validation for fields not in UpdateCorporationSchema
    if (body.type !== undefined) {
      if (body.type !== null && !isValidSector(body.type)) {
        return NextResponse.json({ 
          error: `Invalid sector: "${body.type}". Must be one of: ${SECTORS.join(', ')}`,
          valid_sectors: SECTORS,
        }, { status: 400 });
      }
      updates.type = body.type;
    }

    if (body.focus !== undefined) {
      if (!isValidCorpFocus(body.focus)) {
        return NextResponse.json({ 
          error: `Invalid focus: "${body.focus}". Must be one of: ${CORP_FOCUS_TYPES.join(', ')}`,
          valid_focus_types: CORP_FOCUS_TYPES,
        }, { status: 400 });
      }
      updates.focus = body.focus;
    }

    if (body.share_price !== undefined) {
      const price = parseFloat(body.share_price);
      if (isNaN(price) || price < 1.00) {
        return NextResponse.json({ error: 'Share price must be at least $1.00' }, { status: 400 });
      }
      updates.share_price = price;
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      const corporation = await CorporationModel.findById(id);
      return NextResponse.json(corporation);
    }

    const updated = await CorporationModel.update(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Update corporation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update corporation') }, { status: 500 });
  }
}

// DELETE /api/corporation/:id - Delete corporation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const ceoCheck = await isCeo(id, userId);
    if (!ceoCheck) {
      return NextResponse.json({ error: 'Only the CEO can delete the corporation' }, { status: 403 });
    }

    await CorporationModel.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error('Delete corporation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete corporation') }, { status: 500 });
  }
}
