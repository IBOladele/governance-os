import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const country = searchParams.get('country');

    const where: any = {};
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
    const body = await request.json();

    const entity = await prisma.entity.create({
      data: {
        name: body.name,
        country: body.country,
        legalStructure: body.legalStructure,
        registrationNumber: body.registrationNumber,
        registeredAddress: body.registeredAddress,
        incorporationDate: body.incorporationDate ? new Date(body.incorporationDate) : new Date(),
        financialYearEnd: body.financialYearEnd,
        governingLaw: body.governingLaw,
        auditor: body.auditor,
        parentEntityId: body.parentEntityId,
        regulator: body.regulator,
        isLegacyEntity: body.isLegacyEntity || false,
        status: body.status || 'active',
        notes: body.notes,
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
