// EntityOS — NextAuth v4 Configuration
// Provider: Okta OIDC
// Role resolution: Okta group → EntityOS role mapping

import type { NextAuthOptions, DefaultSession } from 'next-auth';
import OktaProvider from 'next-auth/providers/okta';
import { getUserByEmail, updateUser } from '@/lib/db/users';
import type { UserRole } from '@/lib/db/users';

// ─── Type augmentation ────────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      department: string;
      title: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: UserRole;
    department?: string;
    title?: string;
  }
}

// ─── Okta group → EntityOS role mapping ──────────────────────────────────────

const OKTA_GROUP_ROLE_MAP: Record<string, UserRole> = {
  'EntityOS-SuperAdmin': 'super_admin',
  'EntityOS-Admin':      'admin',
  'EntityOS-Legal':      'legal',
  'EntityOS-Finance':    'finance',
  'EntityOS-Viewer':     'viewer',
};

// Priority order — highest privilege wins when a user is in multiple groups
const ROLE_PRIORITY: UserRole[] = ['super_admin', 'admin', 'legal', 'finance', 'viewer'];

function resolveRoleFromGroups(groups: string[]): UserRole | null {
  const mapped = groups
    .map(g => OKTA_GROUP_ROLE_MAP[g])
    .filter((r): r is UserRole => !!r);

  // Return the highest-priority role found
  return ROLE_PRIORITY.find(r => mapped.includes(r)) ?? null;
}

// ─── Auth options ─────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  providers: [
    OktaProvider({
      clientId:     process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer:       process.env.OKTA_ISSUER!,
      // Request groups claim from Okta (must be configured in Okta app to send groups)
      authorization: { params: { scope: 'openid profile email groups' } },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,   // 8-hour session
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Only runs on first sign-in (account + profile are populated)
      if (account && profile) {
        const groups: string[] = (profile as any).groups ?? [];

        // Resolve role from Okta group membership
        const groupRole = resolveRoleFromGroups(groups);

        // Also check email-based user record for metadata (department, title)
        const email = user?.email ?? token.email ?? '';
        const appUser = email ? getUserByEmail(email) : undefined;

        if (appUser) {
          token.userId     = appUser.id;
          token.department = appUser.department;
          token.title      = appUser.title;
          updateUser(appUser.id, { lastLoginAt: new Date().toISOString() });
        }

        // Group mapping takes priority; fall back to email-based role, then viewer
        token.role = groupRole ?? appUser?.role ?? 'viewer';
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id         = token.userId ?? token.sub ?? '';
        session.user.role       = token.role ?? 'viewer';
        session.user.department = token.department ?? '';
        session.user.title      = token.title ?? '';
      }
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug:  process.env.NODE_ENV === 'development',
};
