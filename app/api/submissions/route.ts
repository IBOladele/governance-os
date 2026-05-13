import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireAdmin } from '@/lib/auth/require';

async function sendSlackNotification(submission: {
  id: string;
  type: string;
  title: string;
  description: string;
  pageUrl: string | null;
  severity: string | null;
  area: string | null;
  priority: string | null;
  submittedBy: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return; // silently skip if not configured

  const isBug = submission.type === 'bug';
  const emoji = isBug ? '🐛' : '💡';
  const severityLabel = submission.severity
    ? { critical: '🔴 Critical', major: '🟠 Major', minor: '🟡 Minor' }[submission.severity] ?? submission.severity
    : null;
  const priorityLabel = submission.priority
    ? { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[submission.priority] ?? submission.priority
    : null;

  const appUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const payload = {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `${emoji} New ${isBug ? 'Bug Report' : 'Feature Request'} — EntityOS` } },
      { type: 'section', text: { type: 'mrkdwn', text: `*${submission.title}*\n${submission.description}` } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Type:*\n${isBug ? 'Bug Report' : 'Feature Request'}` },
          { type: 'mrkdwn', text: `*Submitted by:*\n${submission.submittedBy}` },
          ...(severityLabel ? [{ type: 'mrkdwn', text: `*Severity:*\n${severityLabel}` }] : []),
          ...(submission.area ? [{ type: 'mrkdwn', text: `*Area:*\n${submission.area}` }] : []),
          ...(priorityLabel ? [{ type: 'mrkdwn', text: `*Priority:*\n${priorityLabel}` }] : []),
          ...(submission.pageUrl ? [{ type: 'mrkdwn', text: `*Page:*\n${submission.pageUrl.replace(/^https?:\/\/[^/]+/, '')}` }] : []),
        ],
      },
      {
        type: 'actions',
        elements: [{ type: 'button', text: { type: 'plain_text', text: '👀 Review in EntityOS' }, url: `${appUrl}/admin/submissions`, style: 'primary' }],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[Slack notification failed] HTTP ${res.status}`, text);
    }
  } catch (err) {
    console.error('[Slack notification failed]', err);
  }
}

// GET — admin only (list all submissions for the admin panel)
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (type)   where.type   = type;
    if (status) where.status = status;

    const submissions = await (prisma as any).submission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: submissions, total: submissions.length });
  } catch (err) {
    console.error('[GET /api/submissions]', err);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}

// POST — any authenticated user can submit a bug / feature request
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const body = await request.json();

    const submission = await (prisma as any).submission.create({
      data: {
        type:        body.type,
        title:       body.title,
        description: body.description,
        pageUrl:     body.pageUrl     ?? null,
        component:   body.component   ?? null,
        severity:    body.severity    ?? null,
        area:        body.area        ?? null,
        priority:    body.priority    ?? null,
        submittedBy: ctx.userId,        // always from session, never from body
        status:      'open',
      },
    });

    // Send Slack notification (non-blocking)
    sendSlackNotification({
      id:          submission.id,
      type:        submission.type,
      title:       submission.title,
      description: submission.description,
      pageUrl:     submission.pageUrl,
      severity:    submission.severity,
      area:        submission.area,
      priority:    submission.priority,
      submittedBy: submission.submittedBy,
    });

    return NextResponse.json({ data: submission }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/submissions]', err);
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
  }
}
