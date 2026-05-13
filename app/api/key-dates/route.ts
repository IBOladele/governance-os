import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const keyDates = await prisma.keyDate.findMany({
    where: {
      OR: [
        { organisationId: ctx.organisationId },
        { entity: { organisationId: ctx.organisationId } },
      ],
    },
    include: { entity: { select: { id: true, name: true, country: true } } },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(keyDates);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const body = await req.json();
  const { title, date, category, description, recurrence, status, notes, entityId } = body;

  if (!title || !date) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
  }

  // If an entityId is provided, verify it belongs to the caller's org (MED-8 fix)
  if (entityId) {
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
  }

  const keyDate = await prisma.keyDate.create({
    data: {
      title,
      date:           new Date(date),
      category:       category    || 'other',
      description:    description || null,
      recurrence:     recurrence  || null,
      status:         status      || 'pending',
      notes:          notes       || null,
      entityId:       entityId    || null,
      organisationId: entityId ? null : ctx.organisationId, // group-wide gets org scope
    },
    include: { entity: { select: { id: true, name: true, country: true } } },
  });

  return NextResponse.json(keyDate, { status: 201 });
}
