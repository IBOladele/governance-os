import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth/require';

interface Props {
  params: Promise<{ id: string }>;
}

// GET + PATCH are admin-only (approve / reject workflow)
export async function GET(_req: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const sub = await (prisma as any).submission.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: sub });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { id } = await params;
  try {
    const body = await request.json();

    // Strict allowlist — never accept arbitrary fields
    const allowed = [
      'status', 'prdContent', 'prdGeneratedAt', 'slackMessageTs',
      'approvedAt', 'rejectedAt', 'rejectionNote',
      'implementedAt', 'implementationNote',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    // Set approvedBy / rejectedBy from session, not from body
    if (body.status === 'approved') data.approvedBy = ctx.userId;
    if (body.status === 'rejected') data.rejectedBy = ctx.userId;

    const sub = await (prisma as any).submission.update({ where: { id }, data });
    return NextResponse.json({ data: sub });
  } catch {
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
