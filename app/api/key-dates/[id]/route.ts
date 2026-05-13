import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;

  // Verify the key-date belongs to the caller's org before updating
  const existing = await prisma.keyDate.findFirst({
    where: {
      id,
      OR: [
        { organisationId: ctx.organisationId },
        { entity: { organisationId: ctx.organisationId } },
      ],
    },
  });
  if (!existing) return NextResponse.json({ error: 'Key date not found' }, { status: 404 });

  const body = await req.json();
  const updated = await prisma.keyDate.update({
    where: { id },
    data: {
      title:       body.title       ?? undefined,
      date:        body.date        ? new Date(body.date) : undefined,
      category:    body.category    ?? undefined,
      description: body.description ?? null,
      recurrence:  body.recurrence  ?? null,
      status:      body.status      ?? undefined,
      notes:       body.notes       ?? null,
      entityId:    body.entityId    || null,
    },
    include: { entity: { select: { id: true, name: true, country: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;

  // Verify the key-date belongs to the caller's org before deleting
  const existing = await prisma.keyDate.findFirst({
    where: {
      id,
      OR: [
        { organisationId: ctx.organisationId },
        { entity: { organisationId: ctx.organisationId } },
      ],
    },
  });
  if (!existing) return NextResponse.json({ error: 'Key date not found' }, { status: 404 });

  await prisma.keyDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
