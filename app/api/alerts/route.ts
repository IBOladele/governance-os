import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const status   = searchParams.get('status');
    const category = searchParams.get('category');
    const entityId = searchParams.get('entityId');

    const where: any = { entity: { organisationId: ctx.organisationId } };
    if (severity) where.severity = severity;
    if (status)   where.status   = status;
    if (category) where.category = category;
    if (entityId) where.entityId = entityId;

    let result = await prisma.alert.findMany({ where, include: { entity: true } });

    result = result.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      const sta = { unread: 0, read: 1, dismissed: 2 };
      const d = sta[a.status as keyof typeof sta] - sta[b.status as keyof typeof sta];
      return d !== 0 ? d : sev[a.severity as keyof typeof sev] - sev[b.severity as keyof typeof sev];
    });

    return NextResponse.json({
      data: result, total: result.length,
      unread:   result.filter(a => a.status === 'unread').length,
      critical: result.filter(a => a.severity === 'critical').length,
    });
  } catch (err) {
    console.error('[GET /api/alerts]', err);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();
    const { alertIds, status } = body;

    if (!alertIds || !Array.isArray(alertIds) || !status) {
      return NextResponse.json({ error: 'Missing alertIds or status' }, { status: 400 });
    }

    // Verify all alerts belong to the caller's org before bulk update (IDOR fix)
    const owned = await prisma.alert.count({
      where: { id: { in: alertIds }, entity: { organisationId: ctx.organisationId } },
    });
    if (owned !== alertIds.length) {
      return NextResponse.json({ error: 'One or more alerts not found' }, { status: 404 });
    }

    const updated = await prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data: { status },
    });

    await writeAuditLog({
      action: 'UPDATE', tableName: 'alerts', recordId: alertIds.join(','),
      userId: ctx.userId, newValues: { status, alertIds },
      ...requestMeta(request),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/alerts]', err);
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 });
  }
}
