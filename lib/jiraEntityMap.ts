/**
 * Jira → GovernanceOS entity mapping
 *
 * Maps Jira project/issue entity name patterns to internal entity IDs.
 * Add an entry for each entity that appears in your Jira issues.
 *
 * Pattern matching is case-insensitive and checks if the Jira field *includes*
 * the pattern string. More specific patterns should appear first.
 *
 * Update whenever a new entity is added to GovernanceOS.
 */

export const JIRA_ENTITY_MAP: Array<[pattern: string, entityId: string]> = [
  // ── Add your entity name → entity ID mappings below ──────────────────────
  // Examples:
  // ['acme holdings pte. ltd',   'ent-001'],
  // ['acme uk limited',          'ent-002'],
  // ['acme australia pty ltd',   'ent-003'],
];

/**
 * Resolve a GovernanceOS entity ID from Jira issue fields.
 * Checks entityName, jurisdiction, and summary against JIRA_ENTITY_MAP patterns.
 */
export function resolveEntityId(
  entityName: string,
  jurisdiction: string,
  summary: string,
): string | null {
  const candidates = [entityName, jurisdiction, summary].filter(Boolean);
  for (const [pattern, entityId] of JIRA_ENTITY_MAP) {
    const lower = pattern.toLowerCase();
    if (candidates.some((c) => c.toLowerCase().includes(lower))) {
      return entityId;
    }
  }
  return null;
}

/**
 * Extract a labelled field value from a plain-text Jira description.
 * Looks for lines like "Entity: Acme UK Limited" or "Entity : Acme UK Limited".
 */
export function extractField(text: string, fieldName: string): string {
  const regex = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'im');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Map a Jira issue status name to a GovernanceOS ComplianceStatus value.
 */
export function mapJiraStatusToCompliance(
  jiraStatus: string,
): 'pending' | 'in_progress' | 'completed' | 'overdue' | 'waived' {
  const s = jiraStatus.toLowerCase();
  if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'completed';
  if (s.includes('progress') || s.includes('review') || s.includes('testing')) return 'in_progress';
  if (s.includes('overdue') || s.includes('breach')) return 'overdue';
  if (s.includes('waiv') || s.includes('cancel') || s.includes('won\'t fix')) return 'waived';
  return 'pending';
}

/**
 * Map a plain-English frequency string from a Jira description to a
 * GovernanceOS recurrence value.
 */
export function mapFrequencyToRecurrence(frequency: string): string {
  const f = frequency.toLowerCase();
  if (f.includes('annual') || f.includes('yearly') || f.includes('year')) return 'annually';
  if (f.includes('semi') || f.includes('bi-annual') || f.includes('biannual')) return 'semi_annually';
  if (f.includes('quarter')) return 'quarterly';
  if (f.includes('month')) return 'monthly';
  if (f.includes('week')) return 'weekly';
  if (f.includes('day') || f.includes('daily')) return 'daily';
  if (f.includes('one') || f.includes('once') || f.includes('ad hoc')) return 'one_time';
  return 'annually';
}
