/**
 * PATCH /api/organisations/members/[memberId] — change role
 * DELETE /api/organisations/members/[memberId] — remove from org
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

const VALID_ROLES = ['super_admin', 'admin', 'legal', 'finance', 'viewer'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { memberId } = await params;

  // Verify the membership record belongs to the caller's org (IDOR fix)
  const existing = await prisma.organisationMember.findFirst({
    where: { id: memberId, organisationId: ctx.organisationId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const body = await req.json();
  const safeRole = VALID_ROLES.includes(body.role) ? body.role : undefined;

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
  const auth = await requireAuth(['super_admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { memberId } = await params;

  // Verify the membership record belongs to the caller's org (IDOR fix)
  const existing = await prisma.organisationMember.findFirst({
    where: { id: memberId, organisationId: ctx.organisationId },
  });
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Prevent removing yourself
  if (existing.userId === ctx.userId) {
    return NextResponse.json({ error: 'Cannot remove your own membership' }, { status: 400 });
  }

  await prisma.organisationMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
