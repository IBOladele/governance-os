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
      });

      if (!user || !user.isActive || !user.password) return null;

      const valid = await compare(credentials.password, user.password);
      if (!valid) return null;

      await prisma.user.update({
        where: { id: user.id },
        data:  { lastLoginAt: new Date() },
      });

      return {
        id:         user.id,
        email:      user.email,
        name:       user.name,
        role:       user.role,
        department: user.department ?? '',
        title:      user.title ?? '',
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
        token.userId     = u.id;
        token.role       = u.role;
        token.department = u.department;
        token.title      = u.title;
        return token;
      }

      // Okta sign-in
      if (account && profile) {
        const groups: string[] = (profile as any).groups ?? [];
        const groupRole = resolveRoleFromGroups(groups);
        const email = user?.email ?? token.email ?? '';

        if (email) {
          const appUser = await prisma.user.findUnique({ where: { email } });
          if (appUser) {
            token.userId     = appUser.id;
            token.department = appUser.department ?? '';
            token.title      = appUser.title ?? '';
            await prisma.user.update({ where: { id: appUser.id }, data: { lastLoginAt: new Date() } });
            token.role = groupRole ?? appUser.role ?? 'viewer';
          }
        }
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
