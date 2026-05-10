import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const category = searchParams.get('category'); // executive | independent | non-executive | employee

    const where: any = { isActive: true };
    if (entityId) where.entityId = entityId;

    let result = await prisma.director.findMany({
      where,
      include: { entity: true },
      orderBy: [{ entityId: 'asc' }, { name: 'asc' }],
    });

    if (category) {
      result = result.filter(d => {
        const r = d.role.toLowerCase();
        if (category === 'independent') return r.includes('independent');
        if (category === 'non-executive') return r.includes('non-executive');
        if (category === 'executive') return ['ceo','president','cfo','coo','cmo','cto','ccc','chief','managing director','chairman'].some(k => r.includes(k));
        return true;
      });
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (err) {
    console.error('[GET /api/directors]', err);
    return NextResponse.json(
      { error: 'Failed to fetch directors' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const director = await prisma.director.create({
      data: {
        entityId: body.entityId,
        name: body.name,
        email: body.email,
        role: body.role,
        appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : new Date(),
        termExpiry: body.termExpiry ? new Date(body.termExpiry) : null,
        nationality: body.nationality,
        isActive: true,
        notes: body.notes,
      },
      include: { entity: true },
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'CREATE',
      tableName: 'directors',
      recordId: director.id,
      entityId: director.entityId,
      newValues: director,
      ...meta,
    });

    return NextResponse.json({ data: director }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/directors]', err);
    return NextResponse.json(
      { error: 'Failed to create director' },
      { status: 500 }
    );
  }
}
