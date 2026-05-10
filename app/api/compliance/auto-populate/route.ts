/**
 * POST /api/compliance/auto-populate
 *
 * Walks every active/dormant entity and generates the annual compliance
 * obligations that apply to its jurisdiction over the next 12 months, using
 * the hand-maintained rule table in lib/compliance-rules.ts.
 *
 * Dedup key: (entityId, requirementType, dueDate-day). Existing rows are
 * skipped, so this endpoint is safe to run repeatedly.
 *
 * Every generated obligation is tagged with
 *   notes: "Auto-generated — review before relying on due date"
 * so users know not to treat them as authoritative.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';
import { JURISDICTION_RULES, computeDueDate, type ObligationRule } from '@/lib/compliance-rules';

/**
 * Module-level lock to serialise concurrent auto-populate calls within a
 * single Node process. Not a replacement for a proper DB unique constraint
 * (which would also protect against multi-instance deployments), but prevents
 * duplicates when a user double-clicks the button in dev.
 */
let running = false;

// Parse "31 December" / "December 31" / "Dec 31" into { month: 0-11, day }
const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseFye(fye: string): { month: number; day: number } {
  const s = (fye || '').toLowerCase().trim();
  let month = 11;
  let day = 31;
  for (const [name, idx] of Object.entries(MONTHS)) {
    const re = new RegExp(`\\b${name}\\b`);
    if (re.test(s)) {
      month = idx;
      break;
    }
  }
  const m = s.match(/\b(\d{1,2})\b/);
  if (m) {
    const d = parseInt(m[1], 10);
    if (d >= 1 && d <= 31) day = d;
  }
  return { month, day };
}

function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

export async function POST(request: Request) {
  if (running) {
    return NextResponse.json(
      { error: 'Auto-populate already in progress — please wait for the current run to finish.' },
      { status: 409 },
    );
  }
  running = true;
  try {
    const entities = await prisma.entity.findMany({
      where: { status: { in: ['active', 'dormant'] } },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const horizonEnd = addMonths(today, 12);

    interface Plan {
      entityId: string;
      rule: ObligationRule;
      dueDate: Date;
    }
    const plans: Plan[] = [];
    const unsupportedCountries = new Set<string>();

    for (const e of entities) {
      const rules = JURISDICTION_RULES[e.country];
      if (!rules) {
        unsupportedCountries.add(e.country);
        continue;
      }
      const { month, day } = parseFye(e.financialYearEnd);

      for (const rule of rules.obligations) {
        if (rule.recurrence === 'quarterly') {
          // Generate end-of-quarter dates within the next 12 months
          const y = today.getUTCFullYear();
          const currentQuarter = Math.floor(today.getUTCMonth() / 3);
          for (let i = 0; i < 4; i += 1) {
            const qIdx = currentQuarter + i;
            const qYear = y + Math.floor(qIdx / 4);
            const qMonth = ((qIdx % 4) + 1) * 3 - 1;
            const qEnd = new Date(Date.UTC(qYear, qMonth + 1, 0));
            if (qEnd > today && qEnd <= horizonEnd) {
              plans.push({ entityId: e.id, rule, dueDate: qEnd });
            }
          }
        } else {
          const due = computeDueDate(rule, month, day, today);
          if (due > today && due <= horizonEnd) {
            plans.push({ entityId: e.id, rule, dueDate: due });
          }
        }
      }
    }

    // Dedupe against existing obligations (entityId + requirementType + day)
    const existing = await prisma.complianceObligation.findMany({
      select: { entityId: true, requirementType: true, dueDate: true },
    });
    const key = (eid: string, rt: string, d: Date) =>
      `${eid}|${rt}|${d.toISOString().slice(0, 10)}`;
    const existingKeys = new Set(existing.map((x) => key(x.entityId, x.requirementType, x.dueDate)));

    const results: Array<{
      entityId: string;
      requirementType: string;
      dueDate: string;
      status: 'created' | 'skipped';
      message?: string;
    }> = [];
    let created = 0;
    let skipped = 0;
    const meta = requestMeta(request);

    for (const p of plans) {
      const k = key(p.entityId, p.rule.requirementType, p.dueDate);
      if (existingKeys.has(k)) {
        skipped += 1;
        results.push({
          entityId: p.entityId,
          requirementType: p.rule.requirementType,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          status: 'skipped',
          message: 'Already exists',
        });
        continue;
      }

      try {
        const obligation = await prisma.complianceObligation.create({
          data: {
            entityId: p.entityId,
            requirementType: p.rule.requirementType,
            regulator: p.rule.regulator,
            description: p.rule.description,
            dueDate: p.dueDate,
            status: 'pending',
            owner: p.rule.owner,
            notes: 'Auto-generated — review before relying on due date',
            recurrence: p.rule.recurrence,
          },
        });
        created += 1;
        existingKeys.add(k);
        results.push({
          entityId: p.entityId,
          requirementType: p.rule.requirementType,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          status: 'created',
        });

        await writeAuditLog({
          action: 'CREATE',
          tableName: 'compliance_obligations',
          recordId: obligation.id,
          entityId: p.entityId,
          newValues: obligation,
          notes: 'Auto-populate',
          ...meta,
        });
      } catch (err) {
        skipped += 1;
        results.push({
          entityId: p.entityId,
          requirementType: p.rule.requirementType,
          dueDate: p.dueDate.toISOString().slice(0, 10),
          status: 'skipped',
          message: err instanceof Error ? err.message : 'Database error',
        });
      }
    }

    return NextResponse.json({
      totalPlanned: plans.length,
      entitiesProcessed: entities.length,
      supportedJurisdictions: Object.keys(JURISDICTION_RULES).length,
      unsupportedCountries: Array.from(unsupportedCountries),
      created,
      skipped,
      results,
    });
  } catch (err) {
    console.error('[POST /api/compliance/auto-populate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Auto-populate failed' },
      { status: 500 },
    );
  } finally {
    running = false;
  }
}
