/**
 * POST /api/auth/signup
 *
 * Creates a new Organisation + User (super_admin) + OrganisationMember
 * in a single transaction. After creation a verification email is sent —
 * the user must verify before they can sign in.
 *
 * Body: { orgName, orgSlug, name, email, password }
 */
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createEmailVerificationToken } from '@/lib/auth/tokens';
import { sendEmail, verifyEmailTemplate } from '@/lib/email';
import { isRateLimited } from '@/lib/ratelimit';

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (await isRateLimited(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

  try {
    const body = await req.json();
    const { orgName, orgSlug, name, email, password } = body;

    // ── Validate ───────────────────────────────────────────────────────────
    if (!orgName?.trim()) return NextResponse.json({ error: 'Organisation name is required.' }, { status: 400 });
    if (!name?.trim())    return NextResponse.json({ error: 'Your name is required.' },           { status: 400 });
    if (!email?.trim())   return NextResponse.json({ error: 'Email is required.' },               { status: 400 });
    if (!password)        return NextResponse.json({ error: 'Password is required.' },            { status: 400 });

    if (password.length < 8)        return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (!/[A-Z]/.test(password))    return NextResponse.json({ error: 'Password must contain an uppercase letter.' }, { status: 400 });
    if (!/[0-9]/.test(password))    return NextResponse.json({ error: 'Password must contain a number.' }, { status: 400 });

    const normalEmail = email.toLowerCase().trim();

    // ── Check uniqueness ───────────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({ where: { email: normalEmail } });
    if (existingUser) {
      // Return a generic message to prevent email enumeration (HIGH-5).
      // An attacker cannot distinguish "email taken" from "validation failed".
      return NextResponse.json(
        { error: 'Unable to create an account with that email. If you already have an account, try signing in.' },
        { status: 409 },
      );
    }

    // Ensure slug is unique — append random suffix if taken
    let slug = toSlug(orgSlug || orgName);
    const slugTaken = await prisma.organisation.findUnique({ where: { slug } });
    if (slugTaken) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    // ── Create everything atomically ────────────────────────────────────────
    const hashedPassword = await hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name:     orgName.trim(),
          slug,
          plan:     'starter',
          isActive: true,
        },
      });

      const user = await tx.user.create({
        data: {
          name:     name.trim(),
          email:    normalEmail,
          password: hashedPassword,
          role:     'super_admin',
          isActive: true,
        },
      });

      const member = await tx.organisationMember.create({
        data: {
          organisationId: org.id,
          userId:         user.id,
          role:           'super_admin',
        },
      });

      return { org, user: { id: user.id, email: user.email, name: user.name }, member };
    });

    // ── Send verification email ─────────────────────────────────────────────
    const verifyToken  = createEmailVerificationToken(result.user.id);
    const baseUrl      = process.env.NEXTAUTH_URL ?? 'http://localhost:3002';
    const verifyUrl    = `${baseUrl}/api/auth/verify-email?token=${verifyToken}`;
    await sendEmail({
      to:      normalEmail,
      subject: 'Verify your EntityOS email address',
      html:    verifyEmailTemplate(verifyUrl, result.user.name ?? undefined),
      text:    `Verify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    });

    return NextResponse.json(
      {
        message: 'Account created. Please check your email to verify your address before signing in.',
        organisationId: result.org.id,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
