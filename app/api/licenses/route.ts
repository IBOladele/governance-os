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
    const entityId          = searchParams.get('entityId');
    const status            = searchParams.get('status');
    const expiringWithinDays = searchParams.get('expiringWithinDays');

    const where: any = { entity: { organisationId: ctx.organisationId } };
    if (entityId) where.entityId = entityId;
    if (status)   where.status   = status;

    let result = await prisma.license.findMany({
      where, include: { entity: true }, orderBy: { expiryDate: 'asc' },
    });

    if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays);
      const cutoff = new Date(Date.now() + days * 86400000);
      result = result.filter(l => l.expiryDate !== null && l.expiryDate <= cutoff);
    }

    return NextResponse.json({
      data: result, total: result.length,
      expired: result.filter(l => l.status === 'expired').length,
      active:  result.filter(l => l.status === 'active').length,
    });
  } catch (err) {
    console.error('[GET /api/licenses]', err);
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();

    const entity = await prisma.entity.findFirst({
      where: { id: body.entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const license = await prisma.license.create({
      data: {
        entityId:        body.entityId,
        licenseType:     body.licenseType,
        regulator:       body.regulator,
        licenseNumber:   body.licenseNumber,
        issueDate:       new Date(body.issueDate),
        expiryDate:      new Date(body.expiryDate),
        renewalRequired: body.renewalRequired !== false,
        renewalLeadDays: body.renewalLeadDays || 90,
        status:          body.status || 'active',
        documentUrl:     body.documentUrl,
        notes:           body.notes,
      },
      include: { entity: true },
    });

    await writeAuditLog({
      action: 'CREATE', tableName: 'licenses', recordId: license.id,
      entityId: license.entityId, userId: ctx.userId, newValues: license,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: license }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/licenses]', err);
    return NextResponse.json({ error: 'Failed to create license' }, { status: 500 });
  }
}
