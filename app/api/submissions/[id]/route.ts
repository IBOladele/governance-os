import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface Props {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  try {
    const sub = await (prisma as any).submission.findUnique({ where: { id } });
    if (!sub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: sub });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params;
  try {
    const body = await request.json();
    const allowed = [
      'status', 'prdContent', 'prdGeneratedAt', 'slackMessageTs',
      'approvedBy', 'approvedAt', 'rejectedBy', 'rejectedAt', 'rejectionNote',
      'implementedAt', 'implementationNote',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }
    const sub = await (prisma as any).submission.update({ where: { id }, data });
    return NextResponse.json({ data: sub });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}
