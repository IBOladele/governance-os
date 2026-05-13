import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

// POST /api/board-meetings/[id]/resolutions — record a resolution for a meeting
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(['super_admin', 'admin', 'legal']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id: meetingId } = await params;
    const body = await request.json();

    // Verify meeting belongs to the caller's org (IDOR fix)
    const meeting = await prisma.boardMeeting.findFirst({
      where: { id: meetingId, entity: { organisationId: ctx.organisationId } },
    });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const resolution = await prisma.meetingResolution.create({
      data: {
        meetingId,
        title:        body.title,
        description:  body.description ?? '',
        proposedBy:   ctx.userId,        // always from session
        votesFor:     body.votesFor     ?? 0,
        votesAgainst: body.votesAgainst ?? 0,
        votesAbstain: body.votesAbstain ?? 0,
        status:       body.status       ?? 'proposed',
        notes:        body.notes        || null,
      },
    });

    return NextResponse.json({ data: resolution }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/board-meetings/:id/resolutions]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add resolution' },
      { status: 500 },
    );
  }
}
