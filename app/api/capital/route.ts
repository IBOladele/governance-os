import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'finance']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');

    const where: any = { entity: { organisationId: ctx.organisationId } };
    if (entityId) where.entityId = entityId;

    const result = await prisma.regulatoryCapital.findMany({
      where, include: { entity: true },
    });

    const withStatus = result.map(c => ({
      ...c,
      coverageRatio: c.currentBalance / c.minimumRequired,
      status:   c.currentBalance < c.minimumRequired ? 'breach' : c.currentBalance < c.minimumRequired * 1.2 ? 'warning' : 'healthy',
      shortfall: c.currentBalance < c.minimumRequired ? c.minimumRequired - c.currentBalance : 0,
    }));

    return NextResponse.json({
      data: withStatus, total: result.length,
      breaches: withStatus.filter(c => c.status === 'breach').length,
      warnings: withStatus.filter(c => c.status === 'warning').length,
      healthy:  withStatus.filter(c => c.status === 'healthy').length,
    });
  } catch (err) {
    console.error('[GET /api/capital]', err);
    return NextResponse.json({ error: 'Failed to fetch regulatory capital' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'finance']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();
    const { entityId, currentBalance } = body;

    // Verify entity belongs to org (IDOR fix)
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const updated = await prisma.regulatoryCapital.update({
      where: { entityId }, data: { currentBalance },
    });

    await writeAuditLog({
      action: 'UPDATE', tableName: 'regulatory_capital', recordId: updated.id,
      entityId, userId: ctx.userId, newValues: { currentBalance },
      ...requestMeta(request),
    });

    return NextResponse.json({ data: updated, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[PATCH /api/capital]', err);
    return NextResponse.json({ error: 'Failed to update capital' }, { status: 500 });
  }
}
