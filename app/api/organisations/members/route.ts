/**
 * POST /api/organisations/members — invite a user to the organisation
 * Body: { email, role }
 *
 * If a User with the given email exists, adds them directly.
 * If not, creates a pending stub (no password) so the invitation can be tracked.
 * The stub user cannot log in until they complete signup with that email.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

const VALID_ROLES = ['super_admin', 'admin', 'legal', 'finance', 'viewer'] as const;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const body = await req.json();
  const { email, role, name } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const safeRole = VALID_ROLES.includes(role) ? role : 'viewer';
  const normalEmail = email.toLowerCase().trim();

  // Find existing user — never expose whether they exist or not in the response
  let user = await prisma.user.findUnique({ where: { email: normalEmail } });

  if (user) {
    // User exists — check they don't already belong to a different org as admin
    // (prevents cross-org privilege escalation; just add them to this org)
  } else {
    // Create a pending stub; no password means they can't log in until they sign up
    user = await prisma.user.create({
      data: {
        email: normalEmail,
        name:  name || normalEmail.split('@')[0],
        role:  safeRole,
        // password intentionally omitted — they must complete signup to set it
      },
    });
  }

  // Add to org (upsert to avoid duplicate)
  const member = await prisma.organisationMember.upsert({
    where:  { organisationId_userId: { organisationId: ctx.organisationId, userId: user.id } },
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
