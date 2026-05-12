/**
 * PATCH /api/organisations/members/[memberId] — change role
 * DELETE /api/organisations/members/[memberId] — remove from org
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['super_admin', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const safeRole = ['super_admin', 'admin', 'legal', 'finance', 'viewer'].includes(body.role)
    ? body.role : undefined;

  const member = await prisma.organisationMember.update({
    where: { id: memberId },
    data:  safeRole ? { role: safeRole } : {},
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (ctx.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.organisationMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
