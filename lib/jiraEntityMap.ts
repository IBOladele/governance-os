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
