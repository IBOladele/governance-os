import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Shareholding routes — super_admin only
    if (pathname.includes('/shareholders') || pathname.includes('/shareholding')) {
      if (token?.role !== 'super_admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true = allow through to the middleware function above
      // Return false = redirect to signIn page automatically
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    // Protect everything except login, auth API, and static assets
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
