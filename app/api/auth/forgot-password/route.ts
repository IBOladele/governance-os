/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Always returns 200 (no email enumeration) — even if the email doesn't exist.
 * If it does exist, sends a password-reset link valid for 1 hour.
 *
 * Rate-limited to 3 attempts per 15 minutes per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { sendEmail, passwordResetEmail } from '@/lib/email';
import { isRateLimited } from '@/lib/ratelimit';

const GENERIC_OK = NextResponse.json(
  { message: 'If that email is registered, a reset link has been sent.' },
  { status: 200 }
);

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (await isRateLimited(`forgot:${ip}`, 3, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const email = (body?.email ?? '').toLowerCase().trim();
    if (!email) return GENERIC_OK;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, password: true, isActive: true },
    });

    // Always return the same response — don't reveal whether email exists
    if (!user || !user.isActive || !user.password) return GENERIC_OK;

    const token   = createPasswordResetToken(user.id, user.password);
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendEmail({
      to:      email,
      subject: 'Reset your EntityOS password',
      html:    passwordResetEmail(resetUrl),
      text:    `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    });

    return GENERIC_OK;
  } catch (err) {
    console.error('[forgot-password]', err);
    return GENERIC_OK; // still don't reveal anything
  }
}
