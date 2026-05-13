import type { NextAuthOptions, DefaultSession } from 'next-auth';
import OktaProvider from 'next-auth/providers/okta';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { UserRole } from '@/lib/db/users';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      department: string;
      title: string;
      organisationId: string;
      organisationName: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: UserRole;
    department?: string;
    title?: string;
    organisationId?: string;
    organisationName?: string;
    /** First 8 chars of bcrypt hash — changes when password changes, revoking session */
    pwPrefix?: string;
    /** Timestamp of last DB-level session validity check */
    pwCheckAt?: number;
  }
}

const OKTA_GROUP_ROLE_MAP: Record<string, UserRole> = {
  'EntityOS-SuperAdmin': 'super_admin',
  'EntityOS-Admin':      'admin',
  'EntityOS-Legal':      'legal',
  'EntityOS-Finance':    'finance',
  'EntityOS-Viewer':     'viewer',
};

const ROLE_PRIORITY: UserRole[] = ['super_admin', 'admin', 'legal', 'finance', 'viewer'];

function resolveRoleFromGroups(groups: string[]): UserRole | null {
  const mapped = groups
    .map(g => OKTA_GROUP_ROLE_MAP[g])
    .filter((r): r is UserRole => !!r);
  return ROLE_PRIORITY.find(r => mapped.includes(r)) ?? null;
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'credentials',
    credentials: {
      email:    { label: 'Email',    type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
        include: {
          memberships: {
            include: { organisation: true },
            orderBy: { joinedAt: 'asc' },
            take: 1,
          },
        },
      });

      if (!user || !user.isActive || !user.password) return null;

      // ── Email verification gate ──────────────────────────────────────────
      if (!user.emailVerified) {
        // Throw a named error so the login page can show the right message.
        // NextAuth encodes this as ?error=EmailNotVerified in the redirect URL.
        throw new Error('EmailNotVerified');
      }

      const valid = await compare(credentials.password, user.password);
      if (!valid) return null;

      // ── Update last-login timestamp ──────────────────────────────────────
      await prisma.user.update({
        where: { id: user.id },
        data:  { lastLoginAt: new Date() },
      });

      const primaryMembership = user.memberships[0];

      return {
        id:               user.id,
        email:            user.email,
        name:             user.name,
        role:             primaryMembership?.role ?? user.role,
        department:       user.department ?? '',
        title:            user.title ?? '',
        organisationId:   primaryMembership?.organisationId ?? '',
        organisationName: primaryMembership?.organisation?.name ?? '',
        // Include password prefix so we can detect password changes in JWT callback
        pwPrefix:         user.password.slice(0, 8),
      };
    },
  }),
];

// Only add Okta if fully configured
if (process.env.OKTA_CLIENT_ID && process.env.OKTA_CLIENT_SECRET && process.env.OKTA_ISSUER) {
  providers.push(
    OktaProvider({
      clientId:     process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer:       process.env.OKTA_ISSUER,
      authorization: { params: { scope: 'openid profile email groups' } },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  callbacks: {
    async jwt({ token, user, account, trigger, profile }) {
      // ── New credentials sign-in ──────────────────────────────────────────
      if (user && !account?.provider?.startsWith('okta')) {
        const u = user as any;
        token.userId           = u.id;
        token.role             = u.role;
        token.department       = u.department;
        token.title            = u.title;
        token.organisationId   = u.organisationId;
        token.organisationName = u.organisationName;
        token.pwPrefix         = u.pwPrefix;
        token.pwCheckAt        = Date.now();
        return token;
      }

      // ── Okta sign-in ─────────────────────────────────────────────────────
      if (account && profile) {
        const groups: string[] = (profile as any).groups ?? [];
        const groupRole = resolveRoleFromGroups(groups);
        const email = user?.email ?? token.email ?? '';

        if (email) {
          const appUser = await prisma.user.findUnique({
            where: { email },
            include: {
              memberships: {
                include: { organisation: true },
                orderBy: { joinedAt: 'asc' },
                take: 1,
              },
            },
          });
          if (appUser) {
            const membership = appUser.memberships[0];
            token.userId           = appUser.id;
            token.department       = appUser.department ?? '';
            token.title            = appUser.title ?? '';
            token.organisationId   = membership?.organisationId ?? '';
            token.organisationName = membership?.organisation?.name ?? '';
            token.pwCheckAt        = Date.now();
            await prisma.user.update({ where: { id: appUser.id }, data: { lastLoginAt: new Date() } });
            token.role = groupRole ?? membership?.role ?? appUser.role ?? 'viewer';
          }
        }
        return token;
      }

      // ── Session revocation check (runs on every token refresh) ───────────
      // Re-validates the session against the DB at most once per minute.
      // Revokes the session if the user is deactivated or changed their password.
      if (!trigger && token.userId) {
        const lastCheck = token.pwCheckAt ?? 0;
        const now = Date.now();
        const CHECK_INTERVAL = 60_000; // 1 minute

        if (now - lastCheck > CHECK_INTERVAL) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.userId },
            select: { password: true, isActive: true },
          });

          if (!dbUser || !dbUser.isActive) {
            // User deactivated — destroy the session by stripping the token
            return { sub: token.sub } as any;
          }

          if (
            token.pwPrefix &&
            dbUser.password &&
            dbUser.password.slice(0, 8) !== token.pwPrefix
          ) {
            // Password changed — revoke this session
            return { sub: token.sub } as any;
          }

          token.pwCheckAt = now;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id               = token.userId ?? token.sub ?? '';
        session.user.role             = token.role ?? 'viewer';
        session.user.department       = token.department ?? '';
        session.user.title            = token.title ?? '';
        session.user.organisationId   = token.organisationId ?? '';
        session.user.organisationName = token.organisationName ?? '';
      }
      return session;
    },

    async signIn({ user, account }) {
      // ── Auth event audit log ──────────────────────────────────────────────
      // Runs after authorize() succeeds. We write the LOGIN event here
      // because this callback has access to the resolved user object.
      try {
        const u = user as any;
        const userId = u.id ?? u.userId;
        if (userId) {
          await prisma.auditLog.create({
            data: {
              action:    'LOGIN',
              tableName: 'users',
              recordId:  userId,
              userId,
              notes: `Sign-in via ${account?.provider ?? 'credentials'}`,
            },
          });
        }
      } catch {
        // Never block sign-in over an audit log failure
      }
      return true;
    },
  },

  // NextAuth validates the secret at request time; Railway injects NEXTAUTH_SECRET
  // as a runtime env var (not available during the Docker build step).
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
