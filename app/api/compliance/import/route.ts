/**
 * POST /api/compliance/import
 *
 * Accepts a multipart/form-data upload with a single "file" field containing a
 * CSV of compliance obligations. Columns (header row required):
 *
 *   entityId          (required)  must match an existing Entity.id
 *   requirementType   (required)  free text, e.g. "Annual Return"
 *   regulator         (required)  free text
 *   description       (optional)
 *   dueDate           (required)  YYYY-MM-DD
 *   status            (optional)  pending | submitted | overdue | completed | not_applicable (default: pending)
 *   owner             (optional)  free text
 *   notes             (optional)  free text (quote with "" if it contains commas)
 *   recurrence        (optional)  annual | quarterly | monthly | none (default: annual)
 *
 * Returns a summary JSON body with per-row success/skip details so the client
 * can show the user exactly what happened.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseCsv } from '@/lib/csv';
import { writeAuditLog, requestMeta } from '@/lib/audit';
import { requireAuth } from '@/lib/auth/require';
import type { ComplianceStatus } from '@prisma/client';

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const VALID_STATUSES: ComplianceStatus[] = [
  'pending',
  'submitted',
  'overdue',
  'completed',
  'not_applicable',
];

export async function POST(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing "file" field in multipart upload.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File exceeds 5 MB limit.' }, { status: 413 });
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV is empty or missing a header row.' },
        { status: 400 },
      );
    }

    // Only allow entity IDs that belong to the caller's org (cross-tenant fix)
    const entities = await prisma.entity.findMany({
      where: { organisationId: ctx.organisationId },
      select: { id: true, name: true },
    });
    const entityIds = new Set(entities.map((e) => e.id));

    // Load existing obligations for deduplication (scoped to org)
    const existing = await prisma.complianceObligation.findMany({
      where: { entity: { organisationId: ctx.organisationId } },
      select: { id: true, entityId: true, requirementType: true },
    });
    const existingKeys = new Map(
      existing.map((o) => [`${o.entityId}::${o.requirementType.trim().toLowerCase()}`, o.id]),
    );

    const results: Array<{ row: number; status: 'created' | 'updated' | 'skipped'; message?: string }> = [];
    let created = 0;
    let updated = 0;

    for (let idx = 0; idx < rows.length; idx += 1) {
      const r = rows[idx];
      const lineNo = idx + 2; // account for header row

      const entityId = r.entityId;
      const requirementType = r.requirementType;
      const regulator = r.regulator;
      const dueDateRaw = r.dueDate;

      if (!entityId || !requirementType || !regulator || !dueDateRaw) {
        results.push({
          row: lineNo,
          status: 'skipped',
          message: 'Missing required column (entityId, requirementType, regulator, dueDate).',
        });
        continue;
      }

      if (!entityIds.has(entityId)) {
        results.push({ row: lineNo, status: 'skipped', message: `Unknown or unauthorised entityId: ${entityId}` });
        continue;
      }

      const dueDate = new Date(dueDateRaw);
      if (Number.isNaN(dueDate.getTime())) {
        results.push({
          row: lineNo,
          status: 'skipped',
          message: `Invalid dueDate: ${dueDateRaw} (use YYYY-MM-DD)`,
        });
        continue;
      }

      const status = ((r.status || 'pending').trim().toLowerCase()) as ComplianceStatus;
      if (!VALID_STATUSES.includes(status)) {
        results.push({
          row: lineNo,
          status: 'skipped',
          message: `Invalid status: ${r.status}`,
        });
        continue;
      }

      const dedupeKey = `${entityId}::${requirementType.trim().toLowerCase()}`;
      const existingId = existingKeys.get(dedupeKey);

      try {
        const meta = requestMeta(request);

        if (existingId) {
          // Update existing record instead of creating a duplicate
          await prisma.complianceObligation.update({
            where: { id: existingId },
            data: {
              regulator,
              description: r.description || '',
              dueDate,
              status,
              owner: r.owner || 'Legal Team',
              notes: r.notes || '',
              recurrence: r.recurrence || 'annual',
            },
          });
          results.push({ row: lineNo, status: 'updated' });
          updated += 1;
        } else {
          // Create new record
          const obligation = await prisma.complianceObligation.create({
            data: {
              entityId,
              requirementType,
              regulator,
              description: r.description || '',
              dueDate,
              status,
              owner: r.owner || 'Legal Team',
              notes: r.notes || '',
              recurrence: r.recurrence || 'annual',
            },
          });
          existingKeys.set(dedupeKey, obligation.id); // prevent dupes within same CSV
          results.push({ row: lineNo, status: 'created' });
          created += 1;

          await writeAuditLog({
            action: 'CREATE',
            tableName: 'compliance_obligations',
            recordId: obligation.id,
            entityId,
            userId: ctx.userId,
            newValues: obligation,
            notes: `CSV import — row ${lineNo}`,
            ...meta,
          });
        }
      } catch (err) {
        results.push({
          row: lineNo,
          status: 'skipped',
          message: err instanceof Error ? err.message : 'Database error',
        });
      }
    }

    return NextResponse.json({
      totalRows: rows.length,
      created,
      updated,
      skipped: rows.length - created - updated,
      results,
    });
  } catch (err) {
    console.error('[POST /api/compliance/import]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 },
    );
  }
}
