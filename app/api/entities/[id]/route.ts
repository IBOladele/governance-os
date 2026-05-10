import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

// PATCH /api/entities/[id] — update entity fields in place
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.entity.findUnique({ where: { id } });
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
        incorporationDate: body.incorporationDate !== undefined
          ? (body.incorporationDate ? body.incorporationDate : existing.incorporationDate)
          : existing.incorporationDate,
        legalStructure:    body.legalStructure    ?? existing.legalStructure,
        purpose:           body.purpose           ?? ex.purpose,
        formerName:        body.formerName        ?? ex.formerName,
        regulatorUrl:      body.regulatorUrl      ?? ex.regulatorUrl,
      },
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'UPDATE',
      tableName: 'entities',
      recordId: id,
      entityId: id,
      oldValues: existing,
      newValues: updated,
      ...meta,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/entities/:id]', err);
    return NextResponse.json(
      { error: 'Failed to update entity' },
      { status: 500 },
    );
  }
}
