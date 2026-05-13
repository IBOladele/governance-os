import { NextResponse } from 'next/server';
import type { Prisma, ComplianceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

const VALID_STATUSES: ComplianceStatus[] = ['pending','submitted','overdue','completed','not_applicable'];

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { searchParams } = new URL(request.url);
    const entityId  = searchParams.get('entityId');
    const status    = searchParams.get('status');
    const regulator = searchParams.get('regulator');

    const where: Prisma.ComplianceObligationWhereInput = {
      entity: { organisationId: ctx.organisationId },
    };
    if (entityId)  where.entityId = entityId;
    if (status && VALID_STATUSES.includes(status as ComplianceStatus)) where.status = status as ComplianceStatus;
    if (regulator) where.regulator = regulator;

    let result = await prisma.complianceObligation.findMany({
      where, include: { entity: true },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    result = result.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });

    return NextResponse.json({
      data: result, total: result.length,
      overdue:   result.filter(c => c.status === 'overdue').length,
      pending:   result.filter(c => c.status === 'pending').length,
      completed: result.filter(c => c.status === 'completed').length,
    });
  } catch (err) {
    console.error('[GET /api/compliance]', err);
    return NextResponse.json({ error: 'Failed to fetch compliance obligations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();

    // Verify entity belongs to org
    const entity = await prisma.entity.findFirst({
      where: { id: body.entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const obligation = await prisma.complianceObligation.create({
      data: {
        entityId:        body.entityId,
        requirementType: body.requirementType,
        regulator:       body.regulator,
        description:     body.description,
        dueDate:         new Date(body.dueDate),
        submittedDate:   body.submittedDate ? new Date(body.submittedDate) : null,
        status:          body.status || 'pending',
        owner:           body.owner,
        notes:           body.notes,
        recurrence:      body.recurrence || 'annual',
      },
      include: { entity: true },
    });

    await writeAuditLog({
      action: 'CREATE', tableName: 'compliance_obligations', recordId: obligation.id,
      entityId: obligation.entityId, userId: ctx.userId, newValues: obligation,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: obligation }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/compliance]', err);
    return NextResponse.json({ error: 'Failed to create compliance obligation' }, { status: 500 });
  }
}
