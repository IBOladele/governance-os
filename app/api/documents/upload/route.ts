import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { requireAuth } from '@/lib/auth/require';

// Blocked file extensions that could lead to stored XSS or RCE
const BLOCKED_EXTENSIONS = new Set(['.html', '.htm', '.svg', '.js', '.mjs', '.ts', '.jsx', '.tsx', '.php', '.sh', '.bat', '.exe', '.py']);

// 10 MB upload limit
const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/documents/upload
// Accepts multipart/form-data with a 'file' field.
// Saves to public/uploads/docs/ and returns the public URL.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal', 'finance']);
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Enforce size limit
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    // Reject dangerous file types
    const ext = path.extname(file.name).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: `File type ${ext} is not permitted` }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitise filename and make unique
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
