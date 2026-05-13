// EntityOS — Route protection proxy (Next.js 16+)
// Enforces credentials auth when AUTH_ENABLED=true.
// Shareholding routes are restricted to super_admin.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

export async function proxy(req: NextRequest) {
  if (!AUTH_ENABLED) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Shareholding routes — super_admin only
  const { pathname } = req.nextUrl;
  if (pathname.includes('/shareholders') || pathname.includes('/shareholding')) {
    if (token.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude public routes explicitly — NOT using 'public' as a substring match
    // to avoid blocking paths that happen to contain the word "public" (LOW-1 fix)
    '/((?!$|login|signup|api/auth|_next/static|_next/image|favicon\\.ico|uploads/).*)',
  ],
};
