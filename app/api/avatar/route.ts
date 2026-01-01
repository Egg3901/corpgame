import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Validate file type (inline - FormData files can't use Zod directly)
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Validation failed', details: [{ message: 'File must be an image', path: ['avatar'] }] },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Validation failed', details: [{ message: 'File size must not exceed 5MB', path: ['avatar'] }] },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate filename
    // Sanitize original name
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `${Date.now()}-${originalName}`;
    const publicPath = '/uploads/avatars/' + filename;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    const filePath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    // Update user profile
    await UserModel.updateProfileImage(userId, publicPath);

    return NextResponse.json({ 
      message: 'Avatar uploaded successfully', 
      imageUrl: publicPath 
    });
  } catch (error: unknown) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to upload avatar') }, { status: 500 });
  }
}
