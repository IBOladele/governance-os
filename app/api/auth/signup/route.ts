/**
 * POST /api/auth/signup
 *
 * Creates a new Organisation + User (super_admin) + OrganisationMember
 * in a single transaction. The caller should immediately sign in via
 * next-auth credentials after a 201 response.
 *
 * Body: { orgName, orgSlug, name, email, password }
 */
import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

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
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
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

    return NextResponse.json(
      { message: 'Organisation created.', organisationId: result.org.id },
      { status: 201 },
    );
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
