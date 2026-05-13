/**
 * Shared auth helpers for API route handlers.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.ctx.organisationId, auth.ctx.role, auth.ctx.userId are safe
 *
 *   // Role-gated:
 *   const auth = await requireAuth(request, ['super_admin', 'admin']);
 *   if (!auth.ok) return auth.response;
 */

import { NextResponse } from 'next/server';
import { getOrgContext } from '@/lib/org';

type OrgCtx = { organisationId: string; role: string; userId: string };

type AuthOk    = { ok: true;  ctx: OrgCtx; response?: never };
type AuthFail  = { ok: false; ctx?: never;  response: NextResponse };
type AuthResult = AuthOk | AuthFail;

/**
 * Returns the current org context or a ready-to-return NextResponse on failure.
 * @param allowedRoles  Optional role allowlist. Pass [] to skip role check.
 */
export async function requireAuth(
  allowedRoles: string[] = [],
): Promise<AuthResult> {
  const ctx = await getOrgContext();

  if (!ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(ctx.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, ctx };
}

/** Convenience: super_admin only */
export const requireSuperAdmin = () => requireAuth(['super_admin']);

/** Convenience: super_admin or admin */
export const requireAdmin = () => requireAuth(['super_admin', 'admin']);
