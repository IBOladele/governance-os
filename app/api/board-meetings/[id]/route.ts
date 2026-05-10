import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

// PATCH /api/board-meetings/[id] — update meeting fields (edit, confirm held, save notes)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.boardMeeting.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const updated = await prisma.boardMeeting.update({
      where: { id },
      data: {
        meetingType:      body.meetingType    ?? existing.meetingType,
        meetingDate:      body.meetingDate    ? new Date(body.meetingDate) : existing.meetingDate,
        meetingTime:      body.meetingTime    ?? existing.meetingTime,
        timezone:         body.timezone       ?? existing.timezone,
        locationType:     body.locationType   ?? existing.locationType,
        location:         body.location       !== undefined ? (body.location || null) : existing.location,
        virtualLink:      body.virtualLink    !== undefined ? (body.virtualLink || null) : existing.virtualLink,
        chair:            body.chair          ?? existing.chair,
        quorumRequired:   body.quorumRequired ?? existing.quorumRequired,
        agenda:           body.agenda         ?? existing.agenda,
        recurrence:       body.recurrence     ?? existing.recurrence,
        status:           body.status         ?? existing.status,
        notes:            body.notes          !== undefined ? (body.notes || null) : existing.notes,
        minutes:          body.minutes        !== undefined ? (body.minutes || null) : existing.minutes,
        // Completion fields (set when confirming meeting as held)
        heldAt:           body.heldAt         ? new Date(body.heldAt) : existing.heldAt,
        confirmedBy:      body.confirmedBy    ?? existing.confirmedBy,
        directorsPresent: body.directorsPresent !== undefined ? body.directorsPresent : existing.directorsPresent,
        minutesUrl:       body.minutesUrl     !== undefined ? (body.minutesUrl || null) : existing.minutesUrl,
      },
    });

    // If a new invitedDirectors list was provided, sync attendees
    if (Array.isArray(body.invitedDirectors)) {
      // Delete existing attendees and re-create
      await prisma.meetingAttendee.deleteMany({ where: { meetingId: id } });
      if (body.invitedDirectors.length > 0) {
        await prisma.meetingAttendee.createMany({
          data: body.invitedDirectors.map((directorId: string) => ({
            meetingId: id,
            directorId,
            status: 'invited',
          })),
          skipDuplicates: true,
        });
      }
    }

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'UPDATE',
      tableName: 'board_meetings',
      recordId: id,
      entityId: updated.entityId,
      oldValues: existing,
      newValues: updated,
      ...meta,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/board-meetings/:id]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update meeting' },
      { status: 500 },
    );
  }
}
