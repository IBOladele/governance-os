// EntityOS — Route protection middleware (Next.js 16+)
// Enforces credentials auth when AUTH_ENABLED=true.
// Unauthenticated requests are redirected to /login.
// Shareholding routes are restricted to super_admin.
//
// IMPORTANT: This file MUST be named middleware.ts at the project root.
// Next.js only reads middleware from this exact location.

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

export async function middleware(req: NextRequest) {
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
    // Protect all routes except: login, signup, NextAuth callbacks,
    // Next.js static assets, and the uploads directory.
    '/((?!$|login|signup|api/auth|_next/static|_next/image|favicon\\.ico|uploads/).*)',
  ],
};
