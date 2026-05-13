/**
 * POST /api/auth/reset-password
 * Body: { token: string; password: string }
 *
 * Validates the HMAC reset token, enforces password rules, hashes and saves
 * the new password. The token is single-use — it's tied to the current hash
 * prefix, so once the password changes the token is invalidated automatically.
 *
 * Rate-limited to 5 attempts per 15 minutes per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { verifyPasswordResetToken } from '@/lib/auth/tokens';
import { isRateLimited } from '@/lib/ratelimit';
import { writeAuditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (await isRateLimited(`reset:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { token, password } = body ?? {};

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required.' }, { status: 400 });
    }

    // ── Password strength ────────────────────────────────────────────────────
    if (password.length < 8)
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (!/[A-Z]/.test(password))
      return NextResponse.json({ error: 'Password must contain an uppercase letter.' }, { status: 400 });
    if (!/[0-9]/.test(password))
      return NextResponse.json({ error: 'Password must contain a number.' }, { status: 400 });

    // ── Decode token to get userId (without verifying yet) ───────────────────
    let userId: string;
    try {
      const decoded = Buffer.from(token, 'base64url').toString();
      userId = decoded.split('|')[0];
      if (!userId) throw new Error('bad token');
    } catch {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    // ── Fetch user and verify token (single-use, tied to current password hash) ──
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, isActive: true },
    });

    if (!user || !user.isActive || !user.password) {
      return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 });
    }

    const verified = verifyPasswordResetToken(token, user.password);
    if (!verified) {
      return NextResponse.json({ error: 'This reset link has expired or has already been used.' }, { status: 400 });
    }

    // ── Update password ───────────────────────────────────────────────────────
    const newHash = await hash(password, 12);
    await prisma.user.update({
      where: { id: userId },
      data:  { password: newHash, updatedAt: new Date() },
    });

    await writeAuditLog({
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      userId,
      notes:     'Password reset via email link',
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? undefined,
    });

    return NextResponse.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
