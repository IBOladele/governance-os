import type { NextAuthOptions, DefaultSession } from 'next-auth';
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

export const authOptions: NextAuthOptions = {
  providers: [
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
          pwPrefix:         user.password.slice(0, 8),
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // ── New sign-in ──────────────────────────────────────────────────────
      if (user) {
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

      // ── Session revocation check (runs on every token refresh) ───────────
      // Re-validates the session against the DB at most once per minute.
      // Revokes the session if the user is deactivated or changed their password.
      if (!trigger && token.userId) {
        const now = Date.now();
        if (now - (token.pwCheckAt ?? 0) > 60_000) {
          const dbUser = await prisma.user.findUnique({
            where:  { id: token.userId },
            select: { password: true, isActive: true },
          });

          if (!dbUser || !dbUser.isActive) {
            return { sub: token.sub } as any;
          }

          if (token.pwPrefix && dbUser.password && dbUser.password.slice(0, 8) !== token.pwPrefix) {
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

  secret: process.env.NEXTAUTH_SECRET,
  debug:  process.env.NODE_ENV === 'development',
};
