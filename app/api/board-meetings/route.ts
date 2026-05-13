import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

export async function POST(request: Request) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();

    // Verify entity belongs to org
    const entity = await prisma.entity.findFirst({
      where: { id: body.entityId, organisationId: ctx.organisationId },
    });
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const meeting = await prisma.boardMeeting.create({
      data: {
        entityId:       body.entityId,
        meetingType:    body.meetingType    ?? 'Board Meeting',
        meetingDate:    new Date(body.meetingDate),
        meetingTime:    body.meetingTime    ?? '10:00',
        timezone:       body.timezone       ?? 'UTC',
        locationType:   body.locationType   ?? 'virtual',
        location:       body.location       || null,
        virtualLink:    body.virtualLink    || null,
        chair:          body.chair,
        quorumRequired: body.quorumRequired ?? 3,
        agenda:         body.agenda,
        recurrence:     body.recurrence     ?? 'none',
        status:         body.asDraft ? 'draft' : 'scheduled',
        createdBy:      ctx.userId,   // always from session, never from body
        notes:          body.notes   || null,
      },
    });

    if (Array.isArray(body.invitedDirectors) && body.invitedDirectors.length > 0) {
      await prisma.meetingAttendee.createMany({
        data: body.invitedDirectors.map((directorId: string) => ({
          meetingId: meeting.id, directorId, status: 'invited',
        })),
        skipDuplicates: true,
      });
    }

    await writeAuditLog({
      action: 'CREATE', tableName: 'board_meetings', recordId: meeting.id,
      entityId: meeting.entityId, userId: ctx.userId, newValues: meeting,
      ...requestMeta(request),
    });

    return NextResponse.json({ data: meeting }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/board-meetings]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create meeting' }, { status: 500 });
  }
}
