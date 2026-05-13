// GET  /api/users  — list members of the caller's organisation (admin+)
// POST /api/users  — redirect: use /api/organisations/members to invite users

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    // Return only users who are members of the caller's org
    const members = await prisma.organisationMember.findMany({
      where: { organisationId: ctx.organisationId },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, role: true,
            department: true, title: true, isActive: true,
            lastLoginAt: true, createdAt: true, updatedAt: true,
            // Never expose password or oktaId
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json(members.map(m => ({ ...m.user, orgRole: m.role, memberId: m.id })));
  } catch (err) {
    console.error('[GET /api/users]', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// Creating users is done via /api/organisations/members (invite flow)
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'Use POST /api/organisations/members to invite users.' },
    { status: 405 },
  );
}
