import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';
import { getOrgContext } from '@/lib/org';

export async function GET(request: Request) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const country = searchParams.get('country');

    const where: any = { organisationId: ctx.organisationId };
    if (status) where.status = status;
    if (country) where.country = country;

    const result = await prisma.entity.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { regulatoryCapital: true },
    });

    return NextResponse.json({ data: result, total: result.length });
  } catch (err) {
    console.error('[GET /api/entities]', err);
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getOrgContext();
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const entity = await prisma.entity.create({
      data: {
        name:               body.name,
        country:            body.country,
        legalStructure:     body.legalStructure,
        registrationNumber: body.registrationNumber || 'N/A',
        registeredAddress:  body.registeredAddress || body.country,
        incorporationDate:  body.incorporationDate ? new Date(body.incorporationDate) : new Date(),
        financialYearEnd:   body.financialYearEnd || '31 December',
        governingLaw:       body.governingLaw || body.country,
        auditor:            body.auditor || null,
        parentEntityId:     body.parentEntityId || null,
        regulator:          body.regulator || null,
        isLegacyEntity:     body.isLegacyEntity || false,
        status:             body.status || 'active',
        notes:              body.notes || null,
        organisationId:     ctx.organisationId,
      },
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'CREATE',
      tableName: 'entities',
      recordId: entity.id,
      entityId: entity.id,
      newValues: entity,
      ...meta,
    });

    return NextResponse.json({ data: entity }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/entities]', err);
    return NextResponse.json(
      { error: 'Failed to create entity' },
      { status: 500 }
    );
  }
}
