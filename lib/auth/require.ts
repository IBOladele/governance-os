/**
 * Shared auth helpers for API route handlers.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (!auth.ok) return auth.response;
 *   // auth.ctx.organisationId, auth.ctx.role, auth.ctx.userId are safe
 *
 *   // Role-gated:
 *   const auth = await requireAuth(['super_admin', 'admin']);
 *   if (!auth.ok) return auth.response;
 */

import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/org';

type OrgCtx = { organisationId: string; role: string; userId: string };

type AuthOk    = { ok: true;  ctx: OrgCtx; response?: never };
type AuthFail  = { ok: false; ctx?: never;  response: NextResponse };
type AuthResult = AuthOk | AuthFail;

function unauthorized() {
  return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
}
function forbidden() {
  return { ok: false as const, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
}

/**
 * Returns the current org context or a ready-to-return NextResponse on failure.
 * @param allowedRoles  Optional role allowlist. Pass [] to skip role check.
 */
export async function requireAuth(
  allowedRoles: string[] = [],
): Promise<AuthResult> {
  const ctx = await getOrgContext();
  if (!ctx) return unauthorized();

  if (allowedRoles.length > 0 && !allowedRoles.includes(ctx.role)) {
    return forbidden();
  }

  return { ok: true, ctx };
}

/** Convenience: super_admin or admin */
export const requireAdmin = () => requireAuth(['super_admin', 'admin']);

/** Convenience: super_admin only (org level) */
export const requireSuperAdmin = () => requireAuth(['super_admin']);

/**
 * Platform-owner gate. Restricts access to the EntityOS platform owner only
 * (i.e. the operator running this instance), not just any org's super_admin.
 *
 * Resolution order:
 *   1. PLATFORM_OWNER_EMAIL env var — comma-separated list of authorised emails.
 *   2. Fallback: user must be super_admin in the seed/platform org (org-default-001).
 *
 * Set PLATFORM_OWNER_EMAIL in Railway environment variables to lock this down.
 */
export async function requirePlatformOwner(): Promise<AuthResult> {
  const ctx = await getOrgContext();
  if (!ctx) return unauthorized();

  const ownerEmails = (process.env.PLATFORM_OWNER_EMAIL ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  let isPlatformOwner: boolean;

  if (ownerEmails.length > 0) {
    // Check the session email against the authorised list
    const { getServerSession } = await import('next-auth');
    const { authOptions }      = await import('@/lib/auth/config');
    const session = await getServerSession(authOptions);
    const userEmail = (session?.user?.email ?? '').toLowerCase();
    isPlatformOwner = ownerEmails.includes(userEmail);
  } else {
    // Fallback: super_admin in the platform/seed organisation
    isPlatformOwner = ctx.role === 'super_admin' && ctx.organisationId === 'org-default-001';
  }

  if (!isPlatformOwner) return forbidden();
  return { ok: true, ctx };
}
