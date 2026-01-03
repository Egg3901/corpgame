import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import path from 'path';
import fs from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { getErrorMessage } from '@/lib/utils';

// Helper to check if user is CEO
async function isCeo(corporationId: number, userId: number): Promise<boolean> {
  const corp = await CorporationModel.findById(corporationId);
  return corp?.ceo_id === userId;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const ceoCheck = await isCeo(id, userId);
    if (!ceoCheck) {
      return NextResponse.json({ error: 'Only the CEO can upload the logo' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WEBP images are allowed' }, { status: 400 });
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Ensure upload directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'corporations');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extMap[file.type] || '.png'; // Fallback
    const filename = `corp-${id}-${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const relativePath = `/uploads/corporations/${filename}`;

    // Remove old logo if exists
    const corporation = await CorporationModel.findById(id);
    if (corporation?.logo) {
      const oldFilename = path.basename(corporation.logo);
      const oldPath = path.join(uploadsDir, oldFilename);
      try {
        if (fs.existsSync(oldPath)) {
          await unlink(oldPath);
        }
      } catch (err: unknown) {
        console.warn('Could not remove old logo:', err);
      }
    }

    // Write new file
    await writeFile(filePath, buffer);

    // Update DB
    const updated = await CorporationModel.update(id, { logo: relativePath });
    if (!updated) {
       // Clean up if DB update fails (unlikely but good practice)
       await unlink(filePath).catch(() => {});
       return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    return NextResponse.json({ logo: relativePath });
  } catch (error: unknown) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to upload logo') }, { status: 500 });
  }
}
