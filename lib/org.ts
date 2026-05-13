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
 * In production (NODE_ENV=production), auth is ALWAYS enforced — session is
 * required regardless of the AUTH_ENABLED env var.
 *
 * In non-production environments, setting AUTH_ENABLED=false (the default)
 * bypasses auth and returns the seed org ID so local dev works without login.
 * You must explicitly set AUTH_ENABLED=true to enable auth in development.
 */
export async function getOrgId(): Promise<string | null> {
  // Production: always require a real session — no bypass allowed
  if (process.env.NODE_ENV === 'production') {
    const session = await getServerSession(authOptions);
    return session?.user?.organisationId || null;
  }

  // Non-production: bypass if AUTH_ENABLED is not explicitly set to 'true'
  if (process.env.AUTH_ENABLED !== 'true') {
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
  // Production: always require a real session — no bypass allowed
  if (process.env.NODE_ENV === 'production') {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organisationId) return null;
    return {
      organisationId: session.user.organisationId,
      role:           session.user.role ?? 'viewer',
      userId:         session.user.id ?? '',
    };
  }

  // Non-production: bypass if AUTH_ENABLED is not explicitly set to 'true'
  if (process.env.AUTH_ENABLED !== 'true') {
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
