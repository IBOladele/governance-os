/**
 * PATCH /api/compliance/[id] — update a compliance obligation
 * DELETE /api/compliance/[id] — delete it
 *
 * Both operations require authentication and verify the obligation belongs
 * to the caller's organisation before proceeding.
 *
 * PATCH body accepts any of: status, submittedDate, completedAt,
 * filingReference, confirmedBy, owner, notes. Passing `status: 'completed'`
 * without an explicit `completedAt` stamps the current time.
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';
import { requireAuth } from '@/lib/auth/require';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;
  try {
    const body = await request.json();

    // Verify the obligation belongs to the caller's org
    const existing = await prisma.complianceObligation.findFirst({
      where: { id, entity: { organisationId: ctx.organisationId } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.owner !== undefined) data.owner = body.owner;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.filingReference !== undefined) data.filingReference = body.filingReference;
    if (body.confirmedBy !== undefined) data.confirmedBy = body.confirmedBy;
    if (body.submittedDate !== undefined) {
      data.submittedDate = body.submittedDate ? new Date(body.submittedDate) : null;
    }
    if (body.completedAt !== undefined) {
      data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }

    // If marking complete and no explicit completedAt/submittedDate given, stamp now
    if (body.status === 'completed') {
      if (data.completedAt === undefined) data.completedAt = new Date();
      if (data.submittedDate === undefined && !existing.submittedDate) {
        data.submittedDate = new Date();
      }
    }

    const updated = await prisma.complianceObligation.update({ where: { id }, data });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: body.status && body.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE',
      tableName: 'compliance_obligations',
      recordId: id,
      entityId: existing.entityId,
      userId: ctx.userId,
      oldValues: existing,
      newValues: updated,
      ...meta,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/compliance/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;
  try {
    // Verify the obligation belongs to the caller's org
    const existing = await prisma.complianceObligation.findFirst({
      where: { id, entity: { organisationId: ctx.organisationId } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.complianceObligation.delete({ where: { id } });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'DELETE',
      tableName: 'compliance_obligations',
      recordId: id,
      entityId: existing.entityId,
      userId: ctx.userId,
      oldValues: existing,
      ...meta,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/compliance/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
