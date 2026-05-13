/**
 * Bank-sync integration endpoint.
 *
 * Lets external treasury / banking / ERP systems push bank-balance updates into
 * EntityOS so the Regulatory Capital view stays current without manual entry.
 *
 * ── Inbound (POST) ────────────────────────────────────────────────────────────
 * Headers:
 *   x-api-key        (required) - shared secret; configure via env var
 *                                 CAPITAL_SYNC_API_KEY. In dev a fallback key
 *                                 "dev-local-sync" is accepted.
 *   x-source-system  (optional) - human-readable name of the sending system
 *                                 e.g. "Kyriba", "NetSuite", "DBS-IDEAL".
 *
 * Body (JSON) — accepts either a single update or an array of updates:
 *   {
 *     "accounts": [
 *       {
 *         "accountNumber": "3550-8801-112233",   // match by accountNumber
 *         "balance": 12450000.50,
 *         "currency": "SGD",                     // optional; validated if set
 *         "asOf": "2026-04-10T23:59:00Z"         // optional
 *       }
 *     ],
 *     "regulatoryCapital": [                     // optional, same idea
 *       { "entityId": "ent-001", "currentBalance": 12450000 }
 *     ]
 *   }
 *
 * ── Outbound (GET) ────────────────────────────────────────────────────────────
 * Returns the current sync state plus a short description of how to use POST.
 *
 * This is an append-only operation: every successful POST is written to the
 * audit log with the source system recorded.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

function authorised(request: Request): boolean {
  const expected = process.env.CAPITAL_SYNC_API_KEY;
  if (!expected) {
    // In dev (no env var set), allow a clearly-labelled dev key AND log a loud warning
    if (process.env.NODE_ENV !== 'production') {
      const provided = request.headers.get('x-api-key');
      if (provided === 'dev-local-sync') {
        console.warn('[bank-sync] Using dev-local-sync key — set CAPITAL_SYNC_API_KEY before deploying to production');
        return true;
      }
    }
    // In production with no key configured, reject all requests rather than silently accepting anything
    console.error('[bank-sync] CAPITAL_SYNC_API_KEY env var is not set — rejecting request');
    return false;
  }
  const provided = request.headers.get('x-api-key');
  return !!provided && provided === expected;
}

interface BankAccountUpdate {
  accountNumber: string;
  balance: number;
  currency?: string;
  asOf?: string;
}

interface RegulatoryCapitalUpdate {
  entityId: string;
  currentBalance: number;
  asOf?: string;
}

interface SyncPayload {
  accounts?: BankAccountUpdate[];
  regulatoryCapital?: RegulatoryCapitalUpdate[];
}

export async function GET(request: Request) {
  // GET is an admin-only status endpoint — requires session auth, org-scoped
  const { requireAuth } = await import('@/lib/auth/require');
  const auth = await requireAuth(['super_admin', 'admin', 'finance']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const [bankAccounts, regulatoryCapital] = await Promise.all([
    prisma.bankAccount.findMany({
      where: { entity: { organisationId: ctx.organisationId } },
      include: { entity: { select: { name: true, country: true } } },
      orderBy: { lastUpdated: 'desc' },
    }),
    prisma.regulatoryCapital.findMany({
      where: { entity: { organisationId: ctx.organisationId } },
      include: { entity: { select: { name: true, country: true } } },
      orderBy: { lastUpdated: 'desc' },
    }),
  ]);

  return NextResponse.json({
    endpoint: '/api/capital/bank-sync',
    description:
      'Inbound webhook for bank balances and regulatory capital updates from ' +
      'external treasury/ERP/banking systems. Authenticate with x-api-key header.',
    supportedSources: [
      'Kyriba', 'NetSuite', 'SAP Treasury',
      'DBS IDEAL', 'Barclays.net', 'Bank of Lithuania Link',
      'HSBCnet', 'JPMorgan ACCESS', 'Standard Chartered Straight2Bank',
    ],
    lastSnapshot: {
      bankAccounts: bankAccounts.length,
      regulatoryCapital: regulatoryCapital.length,
      mostRecentBankUpdate: bankAccounts[0]?.lastUpdated ?? null,
      mostRecentCapitalUpdate: regulatoryCapital[0]?.lastUpdated ?? null,
    },
    data: {
      bankAccounts,
      regulatoryCapital,
    },
  });
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return NextResponse.json(
      { error: 'Unauthorized — provide a valid x-api-key header.' },
      { status: 401 }
    );
  }

  const sourceSystem = request.headers.get('x-source-system') || 'unknown';

  let payload: SyncPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const accounts = Array.isArray(payload.accounts) ? payload.accounts : [];
  const caps = Array.isArray(payload.regulatoryCapital) ? payload.regulatoryCapital : [];

  if (accounts.length === 0 && caps.length === 0) {
    return NextResponse.json(
      { error: 'Payload must contain at least one "accounts" or "regulatoryCapital" entry.' },
      { status: 400 }
    );
  }

  const results: Array<{ type: string; identifier: string; status: string; message?: string }> = [];
  const now = new Date();
  const meta = requestMeta(request);

  /** Parse an ISO timestamp string, returning null if missing or invalid. */
  const parseAsOf = (raw: string | undefined): Date | null => {
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  // Bank account updates (matched by accountNumber)
  for (const u of accounts) {
    if (!u.accountNumber || typeof u.balance !== 'number') {
      results.push({ type: 'bankAccount', identifier: u.accountNumber || '(missing)', status: 'skipped', message: 'accountNumber and numeric balance required' });
      continue;
    }
    try {
      const existing = await prisma.bankAccount.findFirst({ where: { accountNumber: u.accountNumber } });
      if (!existing) {
        results.push({ type: 'bankAccount', identifier: u.accountNumber, status: 'not_found' });
        continue;
      }
      if (u.currency && u.currency !== existing.currency) {
        results.push({
          type: 'bankAccount',
          identifier: u.accountNumber,
          status: 'currency_mismatch',
          message: `expected ${existing.currency}, got ${u.currency}`,
        });
        continue;
      }
      const asOf = parseAsOf(u.asOf);
      if (u.asOf && !asOf) {
        results.push({
          type: 'bankAccount',
          identifier: u.accountNumber,
          status: 'skipped',
          message: `Invalid asOf timestamp: ${u.asOf}`,
        });
        continue;
      }
      const updated = await prisma.bankAccount.update({
        where: { id: existing.id },
        data: {
          balance: u.balance,
          lastUpdated: asOf ?? now,
        },
      });
      await writeAuditLog({
        action: 'UPDATE',
        tableName: 'bank_accounts',
        recordId: updated.id,
        entityId: updated.entityId,
        oldValues: { balance: existing.balance, lastUpdated: existing.lastUpdated },
        newValues: { balance: updated.balance, lastUpdated: updated.lastUpdated, source: sourceSystem },
        notes: `bank-sync from ${sourceSystem}`,
        ...meta,
      });
      results.push({ type: 'bankAccount', identifier: u.accountNumber, status: 'updated' });
    } catch (err) {
      results.push({
        type: 'bankAccount',
        identifier: u.accountNumber,
        status: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  // Regulatory capital updates (matched by entityId)
  for (const c of caps) {
    if (!c.entityId || typeof c.currentBalance !== 'number') {
      results.push({ type: 'regulatoryCapital', identifier: c.entityId || '(missing)', status: 'skipped', message: 'entityId and numeric currentBalance required' });
      continue;
    }
    try {
      const existing = await prisma.regulatoryCapital.findFirst({ where: { entityId: c.entityId } });
      if (!existing) {
        results.push({ type: 'regulatoryCapital', identifier: c.entityId, status: 'not_found' });
        continue;
      }
      const buffer =
        existing.minimumRequired > 0
          ? Math.round(((c.currentBalance - existing.minimumRequired) / existing.minimumRequired) * 100)
          : 0;
      const asOf = parseAsOf(c.asOf);
      if (c.asOf && !asOf) {
        results.push({
          type: 'regulatoryCapital',
          identifier: c.entityId,
          status: 'skipped',
          message: `Invalid asOf timestamp: ${c.asOf}`,
        });
        continue;
      }
      const updated = await prisma.regulatoryCapital.update({
        where: { id: existing.id },
        data: {
          currentBalance: c.currentBalance,
          bufferPercentage: buffer,
          lastUpdated: asOf ?? now,
        },
      });
      await writeAuditLog({
        action: 'UPDATE',
        tableName: 'regulatory_capital',
        recordId: updated.id,
        entityId: updated.entityId,
        oldValues: { currentBalance: existing.currentBalance, bufferPercentage: existing.bufferPercentage },
        newValues: { currentBalance: updated.currentBalance, bufferPercentage: buffer, source: sourceSystem },
        notes: `bank-sync from ${sourceSystem}`,
        ...meta,
      });
      results.push({ type: 'regulatoryCapital', identifier: c.entityId, status: 'updated' });
    } catch (err) {
      results.push({
        type: 'regulatoryCapital',
        identifier: c.entityId,
        status: 'error',
        message: err instanceof Error ? err.message : 'unknown error',
      });
    }
  }

  const updated = results.filter(r => r.status === 'updated').length;
  return NextResponse.json({
    source: sourceSystem,
    receivedAt: now.toISOString(),
    totalSubmitted: accounts.length + caps.length,
    totalUpdated: updated,
    results,
  });
}
