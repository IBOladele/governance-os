/**
 * POST /api/webhooks/jira
 *
 * Receives Jira webhook events for the GRR (Global Regulatory Reporting) project
 * and upserts ComplianceObligations in EntityOS.
 *
 * Setup in Jira:
 *   Project Settings → Webhooks → Create webhook
 *   URL:    https://<your-domain>/api/webhooks/jira?secret=<JIRA_WEBHOOK_SECRET>
 *   Events: Issue → Created, Updated
 *   Filter: project = GRR
 *
 * Environment variable:
 *   JIRA_WEBHOOK_SECRET  — optional shared secret for basic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  resolveEntityId,
  extractField,
  mapJiraStatusToCompliance,
  mapFrequencyToRecurrence,
} from '@/lib/jiraEntityMap';

// ── helpers ──────────────────────────────────────────────────────────────────

function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text ?? '';
  if (Array.isArray(node.content)) return node.content.map(adfToText).join('\n');
  return '';
}

function parseIssue(issue: any): {
  jiraKey: string;
  entityId: string | null;
  requirementType: string;
  regulator: string;
  description: string;
  dueDate: Date;
  status: string;
  owner: string;
  notes: string;
  recurrence: string;
  complianceDri: string;
  financeDri: string;
} {
  const fields    = issue.fields ?? {};
  const summary   = fields.summary ?? '';
  const desc      = adfToText(fields.description);
  const jiraKey   = issue.key ?? '';

  const entityName    = extractField(desc, 'Entity');
  const jurisdiction  = extractField(desc, 'Jurisdiction');
  const regulator     = extractField(desc, 'Requestor/Regulator')
                     || extractField(desc, 'Regulator')
                     || 'TBD';
  const frequency     = extractField(desc, 'Frequency');
  const complianceDri = extractField(desc, 'Compliance DRI');
  const financeDri    = extractField(desc, 'Finance DRI');
  const typicalDeadline = extractField(desc, 'Typical Deadline');

  const entityId   = resolveEntityId(entityName, jurisdiction, summary);
  const jiraStatus = fields.status?.name ?? 'Backlog';
  const rawDueDate = fields.duedate ?? fields.customfield_10015 ?? null;

  // Resolve due date: use Jira field if set, else end of current year
  let dueDate: Date;
  if (rawDueDate) {
    dueDate = new Date(rawDueDate);
  } else {
    dueDate = new Date();
    dueDate.setMonth(11, 31); // Dec 31 of current year
  }

  // Build DRI note for the notes field
  const driParts: string[] = [];
  if (complianceDri) driParts.push(`Compliance DRI: ${complianceDri}`);
  if (financeDri)    driParts.push(`Finance DRI: ${financeDri}`);
  const notes = driParts.join(' | ') || `Synced from Jira ${jiraKey}`;

  return {
    jiraKey,
    entityId,
    requirementType: summary.slice(0, 200),
    regulator: regulator.slice(0, 200),
    description: `[${jiraKey}] ${jurisdiction}` + (frequency ? ` | Freq: ${frequency}` : ''),
    dueDate,
    status: mapJiraStatusToCompliance(jiraStatus),
    owner: (complianceDri || (fields.assignee?.displayName) || '').slice(0, 200),
    notes,
    recurrence: mapFrequencyToRecurrence(frequency),
    complianceDri,
    financeDri,
  };
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Optional secret validation
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = body.webhookEvent ?? '';
  const issue     = body.issue;

  // Only handle issue create / update events
  if (!issue || !eventType.includes('jira:issue')) {
    return NextResponse.json({ skipped: true, reason: 'Not an issue event' });
  }

  const parsed = parseIssue(issue);

  if (!parsed.entityId) {
    console.warn(`[jira-webhook] Could not resolve entity for ${parsed.jiraKey}: ${parsed.requirementType}`);
    return NextResponse.json({
      skipped: true,
      reason: `Could not map ${parsed.jiraKey} to an EntityOS entity`,
      jiraKey: parsed.jiraKey,
    });
  }

  // Verify the entity exists
  const entityExists = await prisma.entity.findUnique({ where: { id: parsed.entityId } });
  if (!entityExists) {
    return NextResponse.json({
      skipped: true,
      reason: `Entity ${parsed.entityId} not found in EntityOS`,
    });
  }

  // Upsert: match by jiraKey stored in the description prefix [GRR-XXX]
  const existing = await prisma.complianceObligation.findFirst({
    where: {
      entityId: parsed.entityId,
      description: { startsWith: `[${parsed.jiraKey}]` },
    },
  });

  if (existing) {
    // Update
    await prisma.complianceObligation.update({
      where: { id: existing.id },
      data: {
        requirementType: parsed.requirementType,
        regulator:       parsed.regulator,
        dueDate:         parsed.dueDate,
        status:          parsed.status as any,
        owner:           parsed.owner,
        notes:           parsed.notes,
        recurrence:      parsed.recurrence,
        description:     parsed.description,
      },
    });
    console.log(`[jira-webhook] Updated ${parsed.jiraKey} → obligation ${existing.id}`);
    return NextResponse.json({ action: 'updated', jiraKey: parsed.jiraKey, obligationId: existing.id });
  } else {
    // Create
    const created = await prisma.complianceObligation.create({
      data: {
        entityId:        parsed.entityId,
        requirementType: parsed.requirementType,
        regulator:       parsed.regulator,
        description:     parsed.description,
        dueDate:         parsed.dueDate,
        status:          parsed.status as any,
        owner:           parsed.owner,
        notes:           parsed.notes,
        recurrence:      parsed.recurrence,
      },
    });
    console.log(`[jira-webhook] Created ${parsed.jiraKey} → obligation ${created.id}`);
    return NextResponse.json({ action: 'created', jiraKey: parsed.jiraKey, obligationId: created.id });
  }
}

// ── manual sync endpoint (GET) ────────────────────────────────────────────────
// Hit /api/webhooks/jira?sync=true to manually re-sync all GRR issues via Jira API.
// Requires JIRA_API_TOKEN + JIRA_EMAIL + JIRA_CLOUD_ID env vars.

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('sync') !== 'true') {
    return NextResponse.json({
      info: 'Jira webhook receiver is active. POST Jira events here.',
      setup: 'Add ?sync=true to manually re-sync all GRR issues (requires JIRA_API_TOKEN env var).',
    });
  }

  const token   = process.env.JIRA_API_TOKEN;
  const email   = process.env.JIRA_EMAIL;
  const cloudId = process.env.JIRA_CLOUD_ID;

  if (!token || !email || !cloudId) {
    return NextResponse.json(
      { error: 'Set JIRA_API_TOKEN, JIRA_EMAIL, and JIRA_CLOUD_ID env vars to enable manual sync' },
      { status: 400 }
    );
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  let nextPageToken: string | undefined;
  const maxResults = 100;
  let results = { created: 0, updated: 0, skipped: 0 };

  try {
  while (true) {
    const res = await fetch(
      `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jql: 'project = GRR ORDER BY created ASC',
          ...(nextPageToken ? { nextPageToken } : {}),
          maxResults,
          fields: ['summary', 'description', 'status', 'duedate', 'assignee', 'customfield_10015'],
        }),
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: `Jira API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const issues: any[] = data.issues ?? [];
    if (issues.length === 0) break;

    for (const issue of issues) {
      const parsed = parseIssue(issue);
      if (!parsed.entityId) { results.skipped++; continue; }

      const entityExists = await prisma.entity.findUnique({ where: { id: parsed.entityId } });
      if (!entityExists) { results.skipped++; continue; }

      const existing = await prisma.complianceObligation.findFirst({
        where: {
          entityId: parsed.entityId,
          description: { startsWith: `[${parsed.jiraKey}]` },
        },
      });

      if (existing) {
        await prisma.complianceObligation.update({
          where: { id: existing.id },
          data: {
            requirementType: parsed.requirementType,
            regulator: parsed.regulator,
            dueDate: parsed.dueDate,
            status: parsed.status as any,
            owner: parsed.owner,
            notes: parsed.notes,
            recurrence: parsed.recurrence,
          },
        });
        results.updated++;
      } else {
        await prisma.complianceObligation.create({
          data: {
            entityId: parsed.entityId,
            requirementType: parsed.requirementType,
            regulator: parsed.regulator,
            description: parsed.description,
            dueDate: parsed.dueDate,
            status: parsed.status as any,
            owner: parsed.owner,
            notes: parsed.notes,
            recurrence: parsed.recurrence,
          },
        });
        results.created++;
      }
    }

    if (data.isLast || !data.nextPageToken) break;
    nextPageToken = data.nextPageToken;
  }
  } catch (err: any) {
    console.error('[jira-sync] Error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error during Jira sync' }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...results });
}
