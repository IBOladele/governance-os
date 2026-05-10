import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

// PATCH /api/directors/[id] — update director fields in place
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.director.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Director not found' }, { status: 404 });
    }

    const updated = await prisma.director.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        role: body.role ?? existing.role,
        nationality: body.nationality ?? existing.nationality,
        appointmentDate: body.appointmentDate
          ? new Date(body.appointmentDate)
          : existing.appointmentDate,
        termExpiry:
          body.termExpiry === undefined
            ? existing.termExpiry
            : body.termExpiry
            ? new Date(body.termExpiry)
            : null,
        isActive: body.isActive ?? existing.isActive,
        // guideUrl: explicit null clears it, undefined keeps existing
        ...(body.guideUrl !== undefined ? { guideUrl: body.guideUrl || null } : {}),
      },
    });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'UPDATE',
      tableName: 'directors',
      recordId: id,
      entityId: updated.entityId,
      oldValues: existing,
      newValues: updated,
      ...meta,
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('[PATCH /api/directors/:id]', err);
    return NextResponse.json(
      { error: 'Failed to update director' },
      { status: 500 },
    );
  }
}

// DELETE /api/directors/[id] — hard delete the director row
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const existing = await prisma.director.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Director not found' }, { status: 404 });
    }

    // Clean up any meeting-attendee rows that reference this director first
    // so the FK on MeetingAttendee.directorId doesn't block the delete.
    await prisma.meetingAttendee.deleteMany({ where: { directorId: id } });

    await prisma.director.delete({ where: { id } });

    const meta = requestMeta(request);
    await writeAuditLog({
      action: 'DELETE',
      tableName: 'directors',
      recordId: id,
      entityId: existing.entityId,
      oldValues: existing,
      ...meta,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[DELETE /api/directors/:id]', err);
    return NextResponse.json(
      { error: 'Failed to delete director' },
      { status: 500 },
    );
  }
}
