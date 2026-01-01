import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXT_MAP: Record<(typeof ALLOWED_AVATAR_TYPES)[number], string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  let newFilePath: string | null = null;

  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.type as (typeof ALLOWED_AVATAR_TYPES)[number])) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed' }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const ext = EXT_MAP[file.type as (typeof ALLOWED_AVATAR_TYPES)[number]];
    const filename = `${crypto.randomUUID()}${ext}`;
    const relativePath = `/uploads/avatars/${filename}`;

    newFilePath = path.join(uploadsDir, filename);
    await writeFile(newFilePath, buffer);

    // Best-effort cleanup of previous avatar (only if it points at our avatars folder)
    const existingUser = await UserModel.findById(userId);
    const previousUrl = existingUser?.profile_image_url;
    if (previousUrl && previousUrl.startsWith('/uploads/avatars/')) {
      const oldFilename = path.basename(previousUrl);
      const oldPath = path.join(uploadsDir, oldFilename);
      try {
        if (fs.existsSync(oldPath)) {
          await unlink(oldPath);
        }
      } catch {
        // Ignore cleanup failures
      }
    }

    await UserModel.updateProfileImage(userId, relativePath);

    return NextResponse.json({ profile_image_url: relativePath });
  } catch (error: unknown) {
    if (newFilePath) {
      await unlink(newFilePath).catch(() => {});
    }

    return NextResponse.json({ error: getErrorMessage(error, 'Failed to upload avatar') }, { status: 500 });
  }
}
