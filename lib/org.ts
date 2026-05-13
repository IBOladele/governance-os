/**
 * Multitenancy helpers — resolve the current organisation from session.
 *
 * Usage in API routes:
 *   const orgId = await requireOrgId(request);
 *   if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *
 *   const entities = await prisma.entity.findMany({ where: { organisationId: orgId } });
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

/**
 * Returns the organisationId from the current session, or null if not
 * authenticated / auth is disabled.
 *
 * When AUTH_ENABLED is false AND we are NOT in production, we fall back to the
 * default organisation so local dev works without logging in.
 * In production, auth is always enforced regardless of the env var.
 */
export async function getOrgId(): Promise<string | null> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && process.env.AUTH_ENABLED !== 'true') {
    return 'org-default-001';
  }

  const session = await getServerSession(authOptions);
  return session?.user?.organisationId || null;
}

/**
 * Like getOrgId(), but returns { organisationId, role, userId } so route
 * handlers can check permissions in one call.
 * Returns null when unauthenticated — route handlers should return 401.
 */
export async function getOrgContext(): Promise<{
  organisationId: string;
  role: string;
  userId: string;
} | null> {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev && process.env.AUTH_ENABLED !== 'true') {
    return { organisationId: 'org-default-001', role: 'super_admin', userId: 'usr-super-001' };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.organisationId) return null;

  return {
    organisationId: session.user.organisationId,
    role:           session.user.role ?? 'viewer',
    userId:         session.user.id ?? '',
  };
}
