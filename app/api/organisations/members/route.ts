/**
 * POST /api/organisations/members — invite a user to the organisation
 * Body: { email, role }
 *
 * Creates a User record if none exists, then adds an OrganisationMember row.
 * In production, this would also send an invitation email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';

export async function POST(req: NextRequest) {
  const ctx = await getOrgContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['super_admin', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, role, name } = body;

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  const safeRole = ['super_admin', 'admin', 'legal', 'finance', 'viewer'].includes(role)
    ? role : 'viewer';

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name:  name || email.split('@')[0],
        role:  safeRole,
      },
    });
  }

  // Add to org (upsert to avoid duplicate)
  const member = await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: ctx.organisationId, userId: user.id } },
    update: { role: safeRole },
    create: {
      organisationId: ctx.organisationId,
      userId:         user.id,
      role:           safeRole,
      invitedBy:      ctx.userId,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(member, { status: 201 });
}
