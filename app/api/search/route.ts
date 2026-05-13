import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/require';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const mode = 'insensitive' as const;
  const orgFilter = { organisationId: ctx.organisationId };
  const entityOrgFilter = { entity: { organisationId: ctx.organisationId } };

  const [entities, directors, documents, meetings] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.entity.findMany as any)({
      where: {
        ...orgFilter,
        OR: [
          { name:      { contains: q, mode } },
          { country:   { contains: q, mode } },
          { regulator: { contains: q, mode } },
        ],
      },
      take: 8,
    }),
    prisma.director.findMany({
      where: {
        ...entityOrgFilter,
        OR: [
          { name:  { contains: q, mode } },
          { role:  { contains: q, mode } },
          { email: { contains: q, mode } },
        ],
      },
      take: 8,
    }),
    prisma.document.findMany({
      where: {
        ...entityOrgFilter,
        OR: [
          { name:       { contains: q, mode } },
          { uploadedBy: { contains: q, mode } },
          { category:   { contains: q, mode } },
        ],
      },
      take: 8,
    }),
    prisma.boardMeeting.findMany({
      where: {
        ...entityOrgFilter,
        OR: [
          { meetingType: { contains: q, mode } },
          { chair:       { contains: q, mode } },
          { agenda:      { contains: q, mode } },
        ],
      },
      take: 8,
    }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...entities.map((e: any) => ({
      type: 'entity' as const, id: e.id, title: e.name,
      subtitle: `${e.country} · ${e.status}`, href: `/entities/${e.id}`,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...directors.map((d: any) => ({
      type: 'director' as const, id: d.id, title: d.name,
      subtitle: `${d.role} · ${d.email ?? ''}`, href: `/directors`,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...documents.map((d: any) => ({
      type: 'document' as const, id: d.id, title: d.name,
      subtitle: `${d.category} · ${d.fileType} · v${d.version}`, href: `/documents`,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...meetings.map((m: any) => ({
      type: 'meeting' as const, id: m.id,
      title: `${m.meetingType} — ${m.meetingDate}`,
      subtitle: `Chair: ${m.chair} · ${m.status}`, href: `/board-meetings/${m.id}`,
    })),
  ];

  return NextResponse.json({ results, query: q });
}
