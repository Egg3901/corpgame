import { NextRequest } from 'next/server';
import { UserModel, User } from './models/User';
import { verifyAccessToken } from './auth/jwt';

export interface AuthResult {
  userId: number;
  user?: User;
}

export const getAuthUserId = async (req: NextRequest): Promise<number | null> => {
  const authHeader = req.headers.get('authorization');
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded.userId) return null;

    // Update last seen (fire and forget)
    UserModel.updateLastSeen(decoded.userId).catch((err: unknown) => console.error('Failed to update last seen:', err));

    return decoded.userId;
  } catch (err: unknown) {
    return null;
  }
};

export const getOptionalAuthUserId = getAuthUserId;

export const getAuthUser = async (req: NextRequest): Promise<User | null> => {
  const userId = await getAuthUserId(req);
  if (!userId) return null;
  return await UserModel.findById(userId);
};

export const requireAuth = async (req: NextRequest): Promise<number> => {
  const userId = await getAuthUserId(req);
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
};

export const requireAdmin = async (req: NextRequest): Promise<User> => {
  const user = await getAuthUser(req);
  if (!user) {
    throw new Error('Unauthorized');
  }
  if (!user.is_admin) {
    throw new Error('Forbidden');
  }
  return user;
};
