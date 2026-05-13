import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

/**
 * GET /api/capital/balance
 *
 * Returns the current balances stored in the EntityOS database, scoped to the
 * caller's organisation. Auth required: super_admin, admin, finance.
 */
export async function GET() {
  const auth = await requireAuth(['super_admin', 'admin', 'finance']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const [bankAccounts, regulatoryCapital, entities] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { entity: { organisationId: ctx.organisationId } },
      }),
      prisma.regulatoryCapital.findMany({
        where: { entity: { organisationId: ctx.organisationId } },
      }),
      prisma.entity.findMany({
        where: { organisationId: ctx.organisationId },
        select: { id: true, name: true, country: true },
      }),
    ]);

    const now = new Date().toISOString();

    const enriched = bankAccounts.map(account => {
      const cap    = regulatoryCapital.find(c => c.entityId === account.entityId);
      const entity = entities.find(e => e.id === account.entityId);
      const isBreach = account.balance < account.minRequiredBalance;
      const bufferPct = account.minRequiredBalance > 0
        ? ((account.balance - account.minRequiredBalance) / account.minRequiredBalance * 100).toFixed(1)
        : null;

      return {
        ...account,
        entityName: entity?.name ?? 'Unknown',
        country:    entity?.country ?? 'Unknown',
        fetchedAt:  now,
        source:     'EntityOS database (last updated via bank-sync)',
        status:     isBreach ? 'breach' : account.balance < account.minRequiredBalance * 1.2 ? 'warning' : 'healthy',
        bufferPct,
        capitalRequirement: cap?.minimumRequired ?? null,
      };
    });

    return NextResponse.json({
      data:          enriched,
      fetchedAt:     now,
      totalAccounts: enriched.length,
      breaches:      enriched.filter(a => a.status === 'breach').length,
      message:       'Balance snapshot from EntityOS database. Push live data via POST /api/capital/bank-sync.',
    });
  } catch (err) {
    console.error('[GET /api/capital/balance]', err);
    return NextResponse.json({ error: 'Failed to fetch capital balance' }, { status: 500 });
  }
}
