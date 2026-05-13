/**
 * DELETE /api/compliance/clear — delete all compliance obligations for the
 * caller's organisation. Requires super_admin role + ?confirm=yes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/require';

export async function DELETE(req: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  if (req.nextUrl.searchParams.get('confirm') !== 'yes') {
    return NextResponse.json(
      { error: 'Add ?confirm=yes to confirm deletion.' },
      { status: 400 },
    );
  }

  const { count } = await prisma.complianceObligation.deleteMany({
    where: { entity: { organisationId: ctx.organisationId } },
  });

  return NextResponse.json({ deleted: count });
}
