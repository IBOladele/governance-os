import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

// POST /api/board-meetings/[id]/documents — add a document record to a meeting
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

    const doc = await prisma.meetingDocument.create({
      data: {
        meetingId,
        name:       body.name,
        fileType:   body.fileType ?? body.name.split('.').pop()?.toLowerCase() ?? 'pdf',
        fileSize:   body.fileSize ?? 0,
        uploadedBy: ctx.userId,          // always from session
        category:   body.category ?? 'pack',
        storageUrl: body.storageUrl || null,
      },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/board-meetings/:id/documents]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add document' },
      { status: 500 },
    );
  }
}
