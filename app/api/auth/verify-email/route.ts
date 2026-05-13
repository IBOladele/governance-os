/**
 * GET /api/auth/verify-email?token=...
 *
 * Validates the email verification token and sets emailVerified on the user.
 * Redirects to /login?verified=1 on success, /login?error=VerifyFailed on failure.
 *
 * POST /api/auth/verify-email/resend  (handled separately in resend/route.ts)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyEmailToken } from '@/lib/auth/tokens';
import { writeAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=VerifyFailed', req.url));
  }

  try {
    // Decode userId from token (without verifying yet, so we can look up the user)
    let userId: string;
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      userId = decoded.split('|')[0];
      if (!userId) throw new Error('bad token');
    } catch {
      return NextResponse.redirect(new URL('/login?error=VerifyFailed', req.url));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=VerifyFailed', req.url));
    }

    // If already verified, just redirect to login — idempotent
    if (user.emailVerified) {
      return NextResponse.redirect(new URL('/login?verified=1', req.url));
    }

    // Verify the HMAC token (single-use: tied to emailVerified === null state)
    const verified = verifyEmailToken(token, !!user.emailVerified);
    if (!verified) {
      return NextResponse.redirect(new URL('/login?error=VerifyFailed', req.url));
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: userId },
      data:  { emailVerified: new Date() },
    });

    await writeAuditLog({
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      userId,
      notes:     'Email address verified',
    });

    return NextResponse.redirect(new URL('/login?verified=1', req.url));
  } catch (err) {
    console.error('[verify-email]', err);
    return NextResponse.redirect(new URL('/login?error=VerifyFailed', req.url));
  }
}
