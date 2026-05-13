// GET    /api/users/:id  — get user (own org only, admin+)
// PATCH  /api/users/:id  — update safe profile fields (allowlisted, admin+)
// DELETE /api/users/:id  — deactivate user (super_admin only)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, requireSuperAdmin } from '@/lib/auth/require';
import { writeAuditLog, requestMeta } from '@/lib/audit';

interface Props { params: Promise<{ id: string }> }

/** Verify user is a member of the caller's org */
async function assertOrgMember(userId: string, organisationId: string) {
  const member = await prisma.organisationMember.findUnique({
    where: { organisationId_userId: { organisationId, userId } },
  });
  return !!member;
}

export async function GET(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    if (!(await assertOrgMember(id, ctx.organisationId))) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        department: true, title: true, isActive: true,
        lastLoginAt: true, createdAt: true, updatedAt: true,
        // password, oktaId intentionally excluded
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    console.error('[GET /api/users/:id]', err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Props) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    if (!(await assertOrgMember(id, ctx.organisationId))) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();

    // STRICT ALLOWLIST — never allow role, password, isActive, oktaId, email
    const safeData: Record<string, unknown> = {};
    if (body.name       !== undefined) safeData.name       = String(body.name).slice(0, 200);
    if (body.department !== undefined) safeData.department = String(body.department).slice(0, 200);
    if (body.title      !== undefined) safeData.title      = String(body.title).slice(0, 200);

    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, department: true, title: true } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await prisma.user.update({ where: { id }, data: safeData });

    await writeAuditLog({
      action: 'UPDATE', tableName: 'users', recordId: id,
      userId: ctx.userId, oldValues: existing, newValues: safeData,
      ...requestMeta(req),
    });

    return NextResponse.json({
      id: updated.id, name: updated.name,
      department: updated.department, title: updated.title,
    });
  } catch (err) {
    console.error('[PATCH /api/users/:id]', err);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;
    if (id === ctx.userId) {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    if (!(await assertOrgMember(id, ctx.organisationId))) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    await writeAuditLog({
      action: 'DEACTIVATE', tableName: 'users', recordId: id,
      userId: ctx.userId, oldValues: { isActive: existing.isActive }, newValues: { isActive: false },
      ...requestMeta(req),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/users/:id]', err);
    return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
  }
}
