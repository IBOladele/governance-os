import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

async function fetchAndVerify(shareholderId: string, organisationId: string) {
  return prisma.shareholder.findFirst({
    where: { id: shareholderId, entity: { organisationId } },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { shareholderId } = await params;

  const existing = await fetchAndVerify(shareholderId, ctx.organisationId);
  if (!existing) return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });

  const body = await req.json();

  // Explicit allowlist — never spread body to prevent mass-assignment (MED-3)
  const { sharesHeld, totalShares, percentageOwned, name, shareholderType, shareClass,
          email, entityOwnerId, appointmentDate, notes } = body;

  const pct = sharesHeld && totalShares
    ? parseFloat(((sharesHeld / totalShares) * 100).toFixed(4))
    : parseFloat(percentageOwned ?? existing.percentageOwned ?? 0);

  const updated = await prisma.shareholder.update({
    where: { id: shareholderId },
    data: {
      name:            name            ?? existing.name,
      shareholderType: shareholderType ?? existing.shareholderType,
      shareClass:      shareClass      ?? existing.shareClass,
      email:           email           !== undefined ? (email || null) : existing.email,
      entityOwnerId:   entityOwnerId   !== undefined ? (entityOwnerId || null) : existing.entityOwnerId,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : existing.appointmentDate,
      notes:           notes           !== undefined ? (notes || null) : existing.notes,
      sharesHeld:      sharesHeld      ?? existing.sharesHeld,
      totalShares:     totalShares     ?? existing.totalShares,
      percentageOwned: pct,
    },
    include: { ownerEntity: { select: { id: true, name: true } } },
  });

  await writeAuditLog({
    action: 'UPDATE', tableName: 'shareholders', recordId: shareholderId,
    entityId: existing.entityId, userId: ctx.userId,
    oldValues: existing, newValues: updated,
    ...requestMeta(req),
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { shareholderId } = await params;

  const existing = await fetchAndVerify(shareholderId, ctx.organisationId);
  if (!existing) return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });

  await prisma.shareholder.delete({ where: { id: shareholderId } });

  await writeAuditLog({
    action: 'DELETE', tableName: 'shareholders', recordId: shareholderId,
    entityId: existing.entityId, userId: ctx.userId, oldValues: existing,
    ...requestMeta(req),
  });

  return NextResponse.json({ ok: true });
}
