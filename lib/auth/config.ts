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

      const valid = await compare(credentials.password, user.password);
      if (!valid) return null;

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
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Credentials sign-in — user object carries our custom fields
      if (user && !account?.provider?.startsWith('okta')) {
        const u = user as any;
        token.userId           = u.id;
        token.role             = u.role;
        token.department       = u.department;
        token.title            = u.title;
        token.organisationId   = u.organisationId;
        token.organisationName = u.organisationName;
        return token;
      }

      // Okta sign-in
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
            await prisma.user.update({ where: { id: appUser.id }, data: { lastLoginAt: new Date() } });
            token.role = groupRole ?? membership?.role ?? appUser.role ?? 'viewer';
          }
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
  },

  // LOW-3: fail fast at request time (not build time) if secret is missing in production
  secret: process.env.NEXTAUTH_SECRET ?? (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXTAUTH_SECRET must be set in production. Add it to Railway environment variables.');
    }
    return 'dev-only-insecure-secret';
  })(),
  debug: process.env.NODE_ENV === 'development',
};
