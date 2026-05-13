import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const entityId = searchParams.get('entityId') || undefined;
    const category = searchParams.get('category') || undefined;
    const q        = searchParams.get('q')         || undefined;

    const rows = await prisma.document.findMany({
      where: {
        entity: { organisationId: ctx.organisationId },
        ...(entityId ? { entityId } : {}),
        ...(category ? { category } : {}),
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
  const auth = await requireAuth(['super_admin', 'admin', 'legal', 'finance']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await req.json();
    const { entityId, name, category, fileType, fileSize, notes, tags, storageUrl } = body;

    if (!entityId || !name || !category || !fileType) {
      return NextResponse.json({ error: 'entityId, name, category, and fileType are required' }, { status: 400 });
    }

    // Verify entity belongs to caller's org (IDOR fix)
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

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
        fileSize:   fileSize   ?? 0,
        uploadedBy: ctx.userId,          // always from session, never from body
        notes:      notes      ?? null,
        tags:       tags       ?? [],
        storageUrl: storageUrl ?? null,
        version,
      },
    });

    await writeAuditLog({
      action: 'CREATE', tableName: 'documents', recordId: doc.id,
      entityId, userId: ctx.userId, newValues: { name, category, fileType, version },
      notes: `Uploaded by ${ctx.userId}`,
      ...requestMeta(req),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('[POST /api/documents]', err);
    return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
  }
}
