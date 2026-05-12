import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const keyDates = await prisma.keyDate.findMany({
    include: { entity: { select: { id: true, name: true, country: true } } },
    orderBy: { date: 'asc' },
  });
  return NextResponse.json(keyDates);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, date, category, description, recurrence, status, notes, entityId } = body;

  if (!title || !date) {
    return NextResponse.json({ error: 'Title and date are required' }, { status: 400 });
  }

  const keyDate = await prisma.keyDate.create({
    data: {
      title,
      date:        new Date(date),
      category:    category    || 'other',
      description: description || null,
      recurrence:  recurrence  || null,
      status:      status      || 'pending',
      notes:       notes       || null,
      entityId:    entityId    || null,
    },
    include: { entity: { select: { id: true, name: true, country: true } } },
  });

  return NextResponse.json(keyDate, { status: 201 });
}
