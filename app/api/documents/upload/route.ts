import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/documents/upload
// Accepts multipart/form-data with a 'file' field.
// Saves to public/uploads/docs/ and returns the public URL.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitise filename and make unique
    const ext      = path.extname(file.name);
    const base     = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    const filename = `${Date.now()}-${base}${ext}`;

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'docs');
    await mkdir(uploadDir, { recursive: true });

    await writeFile(path.join(uploadDir, filename), buffer);

    const url = `/uploads/docs/${filename}`;
    return NextResponse.json({ url, name: file.name, size: file.size }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/documents/upload]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
