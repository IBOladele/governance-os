// GET    /api/users/:id  — get user
// PATCH  /api/users/:id  — update user
// DELETE /api/users/:id  — deactivate user (soft delete)

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeAuditLog, requestMeta } from '@/lib/audit';

interface Props { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error('[GET /api/users/:id]', err);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const body = await req.json();

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: body,
    });

    const meta = requestMeta(req);
    await writeAuditLog({
      action: 'UPDATE',
      tableName: 'users',
      recordId: id,
      userId: id,
      oldValues: user,
      newValues: updated,
      ...meta,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/users/:id]', err);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    const meta = requestMeta(req);
    await writeAuditLog({
      action: 'DEACTIVATE',
      tableName: 'users',
      recordId: id,
      userId: id,
      oldValues: { isActive: user.isActive },
      newValues: { isActive: false },
      ...meta,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (err) {
    console.error('[DELETE /api/users/:id]', err);
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}
