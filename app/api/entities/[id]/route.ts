import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';
import { requireAuth } from '@/lib/auth/require';

// PATCH /api/entities/[id] — update entity fields in place
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    const body = await request.json();

    // Verify the entity belongs to the caller's org (IDOR fix)
    const existing = await prisma.entity.findFirst({
      where: { id, organisationId: ctx.organisationId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ex = existing as any;
    const updated = await (prisma.entity.update as any)({
      where: { id },
      data: {
        name:              body.name              ?? existing.name,
        status:            body.status            ?? existing.status,
        registeredAddress: body.registeredAddress ?? existing.registeredAddress,
        governingLaw:      body.governingLaw      ?? existing.governingLaw,
        auditor:           body.auditor           ?? existing.auditor,
        regulator:         body.regulator         ?? existing.regulator,
        financialYearEnd:  body.financialYearEnd  ?? existing.financialYearEnd,
        country:           body.country           ?? existing.country,
        incorporationDate: body.incorporationDate !== undefined
          ? (body.incorporationDate ? new Date(body.incorporationDate) : existing.incorporationDate)
          : existing.incorporationDate,
        legalStructure:    body.legalStructure    ?? existing.legalStructure,
        purpose:           body.purpose           ?? ex.purpose,
        formerName:        body.formerName        ?? ex.formerName,
        regulatorUrl:      body.regulatorUrl      ?? ex.regulatorUrl,
      },
    });

    await writeAuditLog({
      action: 'UPDATE', tableName: 'entities', recordId: id, entityId: id,
      userId: ctx.userId, oldValues: existing, newValues: updated,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/entities/:id]', err);
    return NextResponse.json({ error: 'Failed to update entity' }, { status: 500 });
  }
}
