import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { id } = await params;

  const shareholders = await prisma.shareholder.findMany({
    where: { entityId: id },
    include: { ownerEntity: { select: { id: true, name: true } }, loans: true },
    orderBy: { percentageOwned: 'desc' },
  });

  return NextResponse.json(shareholders);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { id } = await params;
  const body = await req.json();

  const {
    name, email, shareholderType, shareClass, sharesHeld, totalShares,
    percentageOwned, entityOwnerId, isActive, appointmentDate, notes,
  } = body;

  // Derive percentage from shares if both provided, else use direct %
  const pct = sharesHeld && totalShares
    ? parseFloat(((sharesHeld / totalShares) * 100).toFixed(4))
    : parseFloat(percentageOwned ?? 0);

  const shareholder = await prisma.shareholder.create({
    data: {
      entityId: id,
      name,
      email:          email || null,
      shareholderType,
      shareClass:     shareClass || 'Ordinary',
      sharesHeld:     sharesHeld ?? 0,
      totalShares:    totalShares ?? 0,
      percentageOwned: pct,
      entityOwnerId:  entityOwnerId || null,
      isActive:       isActive ?? true,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
      notes:          notes || null,
    },
    include: { ownerEntity: { select: { id: true, name: true } } },
  });

  return NextResponse.json(shareholder, { status: 201 });
}
