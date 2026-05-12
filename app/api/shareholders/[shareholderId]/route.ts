import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { shareholderId } = await params;
  const body = await req.json();

  const { sharesHeld, totalShares, percentageOwned, ...rest } = body;

  const pct = sharesHeld && totalShares
    ? parseFloat(((sharesHeld / totalShares) * 100).toFixed(4))
    : parseFloat(percentageOwned ?? 0);

  const updated = await prisma.shareholder.update({
    where: { id: shareholderId },
    data: {
      ...rest,
      sharesHeld:      sharesHeld ?? undefined,
      totalShares:     totalShares ?? undefined,
      percentageOwned: pct,
      email:           rest.email || null,
      entityOwnerId:   rest.entityOwnerId || null,
      appointmentDate: rest.appointmentDate ? new Date(rest.appointmentDate) : undefined,
    },
    include: { ownerEntity: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { shareholderId } = await params;

  await prisma.shareholder.delete({ where: { id: shareholderId } });
  return NextResponse.json({ ok: true });
}
