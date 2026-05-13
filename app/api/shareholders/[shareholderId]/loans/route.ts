import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { shareholderId } = await params;

  // Verify the shareholder belongs to the caller's org before creating a loan
  const shareholder = await prisma.shareholder.findFirst({
    where: { id: shareholderId, entity: { organisationId: ctx.organisationId } },
  });
  if (!shareholder) {
    return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });
  }

  const body = await req.json();

  const loan = await prisma.shareholderLoan.create({
    data: {
      entityId:        shareholder.entityId,
      shareholderId,
      principal:       parseFloat(body.principal),
      currency:        body.currency || 'USD',
      interestRate:    body.interestRate != null ? parseFloat(body.interestRate) : null,
      issueDate:       new Date(body.issueDate),
      maturityDate:    body.maturityDate ? new Date(body.maturityDate) : null,
      isConvertible:   body.isConvertible ?? false,
      conversionTerms: body.conversionTerms || null,
      status:          body.status || 'active',
      notes:           body.notes || null,
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
