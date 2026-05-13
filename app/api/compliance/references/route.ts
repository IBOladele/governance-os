import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

/**
 * GET /api/compliance/references
 *
 * Returns all directors and shareholders for the caller's org with their IDs,
 * so users can look up reference IDs needed for compliance CSV uploads.
 */
export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const [entities, directors, shareholders] = await Promise.all([
      prisma.entity.findMany({
        where: { organisationId: ctx.organisationId },
        select: { id: true, name: true, country: true },
        orderBy: { name: 'asc' },
      }),
      prisma.director.findMany({
        where: { entity: { organisationId: ctx.organisationId } },
        select: {
          id: true, name: true, role: true, email: true, isActive: true,
          entityId: true,
          entity: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.shareholder.findMany({
        where: { entity: { organisationId: ctx.organisationId } },
        select: {
          id: true, name: true, shareholderType: true, percentageOwned: true, isActive: true,
          entityId: true,
          entity: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({ entities, directors, shareholders });
  } catch (err) {
    console.error('[GET /api/compliance/references]', err);
    return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 });
  }
}
