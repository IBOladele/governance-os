import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

async function verifyEntityOwnership(entityId: string, organisationId: string) {
  return prisma.entity.findFirst({ where: { id: entityId, organisationId } });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;

  // Verify entity belongs to caller's org (IDOR fix)
  const entity = await verifyEntityOwnership(id, ctx.organisationId);
  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  const shareholders = await prisma.shareholder.findMany({
    where: { entityId: id },
    include: { ownerEntity: { select: { id: true, name: true } }, loans: true },
    orderBy: { percentageOwned: 'desc' },
  });

  return NextResponse.json(shareholders);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;

  // Verify entity belongs to caller's org (IDOR fix)
  const entity = await verifyEntityOwnership(id, ctx.organisationId);
  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  const body = await req.json();

  const {
    name, email, shareholderType, shareClass, sharesHeld, totalShares,
    percentageOwned, entityOwnerId, isActive, appointmentDate, notes,
  } = body;

  const pct = sharesHeld && totalShares
    ? parseFloat(((sharesHeld / totalShares) * 100).toFixed(4))
    : parseFloat(percentageOwned ?? 0);

  const shareholder = await prisma.shareholder.create({
    data: {
      entityId: id,
      name,
      email:           email || null,
      shareholderType,
      shareClass:      shareClass || 'Ordinary',
      sharesHeld:      sharesHeld ?? 0,
      totalShares:     totalShares ?? 0,
      percentageOwned: pct,
      entityOwnerId:   entityOwnerId || null,
      isActive:        isActive ?? true,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
      notes:           notes || null,
    },
    include: { ownerEntity: { select: { id: true, name: true } } },
  });

  await writeAuditLog({
    action: 'CREATE', tableName: 'shareholders', recordId: shareholder.id,
    entityId: id, userId: ctx.userId, newValues: shareholder,
    ...requestMeta(req),
  });

  return NextResponse.json(shareholder, { status: 201 });
}
