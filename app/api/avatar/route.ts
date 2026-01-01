import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
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

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed' }, { status: 400 });
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate secure filename using UUID to prevent path traversal
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.type] || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    const publicPath = '/uploads/avatars/' + filename;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    // Update user profile
    await UserModel.updateProfileImage(userId, publicPath);

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      imageUrl: publicPath,
      profile_image_url: publicPath,
    });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to upload avatar') }, { status: 500 });
  }
}
