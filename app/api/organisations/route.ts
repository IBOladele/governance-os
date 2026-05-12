import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';

/** GET /api/organisations — current org details */
export async function GET() {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await prisma.organisation.findUnique({
    where: { id: ctx.organisationId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });

  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
  return NextResponse.json(org);
}

/** PATCH /api/organisations — update org name/logo (admin only) */
export async function PATCH(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['super_admin', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const updated = await prisma.organisation.update({
    where: { id: ctx.organisationId },
    data: {
      name:    body.name    ?? undefined,
      logoUrl: body.logoUrl ?? undefined,
    },
  });

  return NextResponse.json(updated);
}
