import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

type Props = { params: Promise<{ id: string }> };

async function fetchAndVerify(id: string, organisationId: string) {
  return prisma.director.findFirst({
    where: { id, entity: { organisationId } },
  });
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await fetchAndVerify(id, ctx.organisationId);
    if (!existing) return NextResponse.json({ error: 'Director not found' }, { status: 404 });

    const updated = await prisma.director.update({
      where: { id },
      data: {
        name:            body.name            ?? existing.name,
        email:           body.email           ?? existing.email,
        role:            body.role            ?? existing.role,
        nationality:     body.nationality     ?? existing.nationality,
        appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : existing.appointmentDate,
        termExpiry:      body.termExpiry === undefined ? existing.termExpiry : body.termExpiry ? new Date(body.termExpiry) : null,
        isActive:        body.isActive        ?? existing.isActive,
        ...(body.guideUrl !== undefined ? { guideUrl: body.guideUrl || null } : {}),
      },
    });

    await writeAuditLog({
      action: 'UPDATE', tableName: 'directors', recordId: id,
      entityId: updated.entityId, userId: ctx.userId, oldValues: existing, newValues: updated,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/directors/:id]', err);
    return NextResponse.json({ error: 'Failed to update director' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    const existing = await fetchAndVerify(id, ctx.organisationId);
    if (!existing) return NextResponse.json({ error: 'Director not found' }, { status: 404 });

    await prisma.meetingAttendee.deleteMany({ where: { directorId: id } });
    await prisma.director.delete({ where: { id } });

    await writeAuditLog({
      action: 'DELETE', tableName: 'directors', recordId: id,
      entityId: existing.entityId, userId: ctx.userId, oldValues: existing,
      ...requestMeta(request),
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /api/directors/:id]', err);
    return NextResponse.json({ error: 'Failed to delete director' }, { status: 500 });
  }
}
