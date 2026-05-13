import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/require';

/**
 * GET /api/admin/platform
 *
 * Platform-owner view: returns all organisations with entity + member counts.
 * Bypasses org scoping by design — accessible to super_admin only.
 */
export async function GET() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const orgs = await prisma.organisation.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: {
            entities: true,
            members:  true,
          },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        entities: {
          select: {
            id:       true,
            name:     true,
            country:  true,
            status:   true,
            legalStructure: true,
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    return NextResponse.json({ data: orgs, total: orgs.length });
  } catch (err) {
    console.error('[GET /api/admin/platform]', err);
    return NextResponse.json({ error: 'Failed to fetch platform data' }, { status: 500 });
  }
}
