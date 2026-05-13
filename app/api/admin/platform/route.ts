import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePlatformOwner } from '@/lib/auth/require';

/**
 * GET /api/admin/platform
 *
 * Platform-owner view: returns all organisations with entity + member counts.
 * Bypasses org scoping by design — accessible to the platform owner only
 * (not just any super_admin). See requirePlatformOwner() in lib/auth/require.ts.
 */
export async function GET() {
  const auth = await requirePlatformOwner();
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
            id:             true,
            name:           true,
            country:        true,
            status:         true,
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
