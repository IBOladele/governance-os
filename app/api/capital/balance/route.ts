import { NextResponse } from 'next/server';
import { getBankAccounts, getRegulatoryCapital, getEntities } from '@/lib/db/queries';

/**
 * GET /api/capital/balance
 *
 * Returns the current balances stored in the EntityOS database.
 * This is a READ-ONLY snapshot — it does NOT pull live data from external banking APIs.
 *
 * To push live balance updates into EntityOS, use POST /api/capital/bank-sync
 * from your treasury system (Kyriba, NetSuite, DBS IDEAL, etc.).
 *
 * Production integration note:
 *   Connect bank-sync to your banking APIs / ERP and schedule it to run daily.
 *   This endpoint will then reflect real-time data.
 */
export async function GET() {
  const [bankAccounts, regulatoryCapital, entities] = await Promise.all([
    getBankAccounts(),
    getRegulatoryCapital(),
    getEntities(),
  ]);

  const now = new Date().toISOString();

  const enriched = bankAccounts.map(account => {
    const cap = regulatoryCapital.find(c => c.entityId === account.entityId);
    const entity = entities.find(e => e.id === account.entityId);
    const isBreach = account.balance < account.minRequiredBalance;
    const bufferPct = account.minRequiredBalance > 0
      ? ((account.balance - account.minRequiredBalance) / account.minRequiredBalance * 100).toFixed(1)
      : null;

    return {
      ...account,
      entityName: entity?.name ?? 'Unknown',
      country: entity?.country ?? 'Unknown',
      fetchedAt: now,
      source: 'EntityOS database (last updated via bank-sync)',
      status: isBreach ? 'breach' : account.balance < account.minRequiredBalance * 1.2 ? 'warning' : 'healthy',
      bufferPct,
      capitalRequirement: cap?.capitalRequirement ?? null,
    };
  });

  return NextResponse.json({
    data: enriched,
    fetchedAt: now,
    totalAccounts: enriched.length,
    breaches: enriched.filter(a => a.status === 'breach').length,
    message: 'Balance snapshot from EntityOS database. Push live data via POST /api/capital/bank-sync.',
  });
}
