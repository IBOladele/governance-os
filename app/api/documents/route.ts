import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId  = searchParams.get('entityId')  || undefined;
    const category  = searchParams.get('category')  || undefined;
    const q         = searchParams.get('q')         || undefined;

    const rows = await prisma.document.findMany({
      where: {
        ...(entityId  ? { entityId }  : {}),
        ...(category  ? { category }  : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return NextResponse.json(rows.map((d: any) => ({
      id:         d.id,
      entityId:   d.entityId,
      name:       d.name,
      category:   d.category,
      fileType:   d.fileType,
      fileSize:   d.fileSize,
      uploadedBy: d.uploadedBy,
      storageUrl: d.storageUrl ?? null,
      version:    d.version,
      tags:       d.tags,
      notes:      d.notes ?? null,
      uploadedAt: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : d.uploadedAt,
    })));
  } catch (err) {
    console.error('[GET /api/documents]', err);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { entityId, name, category, fileType, fileSize, uploadedBy, notes, tags, storageUrl } = body;

    if (!entityId || !name || !category || !fileType) {
      return NextResponse.json({ error: 'entityId, name, category, and fileType are required' }, { status: 400 });
    }

    // Check if a document with same name exists for same entity → increment version
    const existing = await prisma.document.findFirst({
      where: { entityId, name },
      orderBy: { version: 'desc' },
    });
    const version = existing ? existing.version + 1 : 1;

    const doc = await prisma.document.create({
      data: {
        entityId,
        name,
        category,
        fileType,
        fileSize:   fileSize    ?? 0,
        uploadedBy: uploadedBy  ?? 'Unknown',
        notes:      notes       ?? null,
        tags:       tags        ?? [],
        storageUrl: storageUrl  ?? null,
        version,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityId,
        action:    'CREATE',
        tableName: 'documents',
        recordId:  doc.id,
        newValues: { name, category, fileType, version } as object,
        notes:     `Uploaded by ${uploadedBy ?? 'Unknown'}`,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('[POST /api/documents]', err);
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
  }
}
