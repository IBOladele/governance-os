import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const { id } = await params;
  await prisma.keyDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
