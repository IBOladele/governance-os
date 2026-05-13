import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

type Props = { params: Promise<{ id: string }> };

async function fetchAndVerify(id: string, organisationId: string) {
  return prisma.boardMeeting.findFirst({ where: { id, entity: { organisationId } } });
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await fetchAndVerify(id, ctx.organisationId);
    if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    const updated = await prisma.boardMeeting.update({
      where: { id },
      data: {
        meetingType:      body.meetingType      ?? existing.meetingType,
        meetingDate:      body.meetingDate      ? new Date(body.meetingDate) : existing.meetingDate,
        meetingTime:      body.meetingTime      ?? existing.meetingTime,
        timezone:         body.timezone         ?? existing.timezone,
        locationType:     body.locationType     ?? existing.locationType,
        location:         body.location         !== undefined ? (body.location || null) : existing.location,
        virtualLink:      body.virtualLink      !== undefined ? (body.virtualLink || null) : existing.virtualLink,
        chair:            body.chair            ?? existing.chair,
        quorumRequired:   body.quorumRequired   ?? existing.quorumRequired,
        agenda:           body.agenda           ?? existing.agenda,
        recurrence:       body.recurrence       ?? existing.recurrence,
        status:           body.status           ?? existing.status,
        notes:            body.notes            !== undefined ? (body.notes || null) : existing.notes,
        minutes:          body.minutes          !== undefined ? (body.minutes || null) : existing.minutes,
        heldAt:           body.heldAt           ? new Date(body.heldAt) : existing.heldAt,
        confirmedBy:      body.confirmedBy      ?? existing.confirmedBy,
        directorsPresent: body.directorsPresent !== undefined ? body.directorsPresent : existing.directorsPresent,
        minutesUrl:       body.minutesUrl       !== undefined ? (body.minutesUrl || null) : existing.minutesUrl,
      },
    });

    if (Array.isArray(body.invitedDirectors)) {
      await prisma.meetingAttendee.deleteMany({ where: { meetingId: id } });
      if (body.invitedDirectors.length > 0) {
        await prisma.meetingAttendee.createMany({
          data: body.invitedDirectors.map((directorId: string) => ({ meetingId: id, directorId, status: 'invited' })),
          skipDuplicates: true,
        });
      }
    }

    await writeAuditLog({
      action: 'UPDATE', tableName: 'board_meetings', recordId: id,
      entityId: updated.entityId, userId: ctx.userId, oldValues: existing, newValues: updated,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/board-meetings/:id]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update meeting' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    const existing = await fetchAndVerify(id, ctx.organisationId);
    if (!existing) return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });

    await prisma.boardMeeting.delete({ where: { id } });

    await writeAuditLog({
      action: 'DELETE', tableName: 'board_meetings', recordId: id,
      entityId: existing.entityId, userId: ctx.userId, oldValues: existing,
      ...requestMeta(request),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/board-meetings/:id]', err);
    return NextResponse.json({ error: 'Failed to delete meeting' }, { status: 500 });
  }
}
