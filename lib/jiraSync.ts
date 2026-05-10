/**
 * jiraSync.ts
 *
 * Pushes EntityOS compliance-status changes back to Jira.
 *
 * Required env vars (same ones used by the manual sync GET handler):
 *   JIRA_API_TOKEN  — Jira personal access token / API token
 *   JIRA_EMAIL      — Atlassian account email for Basic auth
 *   JIRA_CLOUD_ID   — Atlassian Cloud ID (find at id.atlassian.com/manage-profile/link-preferences)
 *
 * EntityOS status → Jira transition mapping:
 *   completed → "Done"
 *   in_progress → "In Progress"
 *   overdue → "In Progress"   (nearest equivalent)
 *   pending → "To Do"
 */

// Maps EntityOS statuses to the Jira transition name to target
const ENTITY_OS_TO_JIRA_STATUS: Record<string, string> = {
  completed:   'Done',
  submitted:   'Done',
  in_progress: 'In Progress',
  overdue:     'In Progress',
  pending:     'To Do',
};

/**
 * Extract the Jira issue key from a compliance description like "[GRR-42] Singapore | Freq: Annual"
 * Returns null if no key found.
 */
export function extractJiraKey(description: string | null | undefined): string | null {
  if (!description) return null;
  const match = description.match(/^\[([A-Z]+-\d+)\]/);
  return match ? match[1] : null;
}

/**
 * Fetch all available transitions for a Jira issue.
 */
async function getTransitions(
  cloudId: string,
  issueKey: string,
  auth: string,
): Promise<Array<{ id: string; name: string }>> {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${issueKey}/transitions`;
  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    console.error(`[jiraSync] Failed to fetch transitions for ${issueKey}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  return data.transitions ?? [];
}

/**
 * Push a status change to Jira.
 * Does nothing (silently) if env vars are missing or the description has no Jira key.
 * Logs warnings but never throws — Jira sync failures must never break the EntityOS PATCH.
 */
export async function pushStatusToJira(
  description: string | null | undefined,
  entityOsStatus: string,
): Promise<void> {
  const jiraKey = extractJiraKey(description);
  if (!jiraKey) return; // not a Jira-linked obligation

  const token   = process.env.JIRA_API_TOKEN;
  const email   = process.env.JIRA_EMAIL;
  const cloudId = process.env.JIRA_CLOUD_ID;

  if (!token || !email || !cloudId) {
    console.warn(
      '[jiraSync] Missing env vars (JIRA_API_TOKEN, JIRA_EMAIL, JIRA_CLOUD_ID) — skipping Jira update for',
      jiraKey,
    );
    return;
  }

  const targetTransitionName = ENTITY_OS_TO_JIRA_STATUS[entityOsStatus];
  if (!targetTransitionName) {
    console.warn('[jiraSync] No Jira transition mapped for EntityOS status:', entityOsStatus);
    return;
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    const transitions = await getTransitions(cloudId, jiraKey, auth);
    // Match by name (case-insensitive)
    const transition = transitions.find(
      t => t.name.toLowerCase() === targetTransitionName.toLowerCase(),
    );

    if (!transition) {
      console.warn(
        `[jiraSync] No transition named "${targetTransitionName}" found for ${jiraKey}.`,
        'Available:', transitions.map(t => t.name).join(', '),
      );
      return;
    }

    const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/${jiraKey}/transitions`;
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify({ transition: { id: transition.id } }),
    });

    if (res.ok || res.status === 204) {
      console.log(`[jiraSync] Transitioned ${jiraKey} → "${targetTransitionName}"`);
    } else {
      const text = await res.text().catch(() => '');
      console.error(`[jiraSync] Transition failed for ${jiraKey}: ${res.status}`, text);
    }
  } catch (err) {
    // Never let Jira errors propagate — EntityOS is the source of truth
    console.error('[jiraSync] Unexpected error syncing to Jira:', err);
  }
}
