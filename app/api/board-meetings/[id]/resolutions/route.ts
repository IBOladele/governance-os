import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/board-meetings/[id]/resolutions — record a resolution for a meeting
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: meetingId } = await params;
    const body = await request.json();

    const meeting = await prisma.boardMeeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const resolution = await prisma.meetingResolution.create({
      data: {
        meetingId,
        title:        body.title,
        description:  body.description ?? '',
        proposedBy:   body.proposedBy ?? 'system',
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
