import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';

/** Fetch the loan and verify it belongs to the caller's org. */
async function fetchAndVerify(loanId: string, organisationId: string) {
  return prisma.shareholderLoan.findFirst({
    where: {
      id: loanId,
      entity: { organisationId },
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ loanId: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { loanId } = await params;

  const loan = await fetchAndVerify(loanId, ctx.organisationId);
  if (!loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  }

  const body = await req.json();

  const updated = await prisma.shareholderLoan.update({
    where: { id: loanId },
    data: {
      principal:       body.principal != null ? parseFloat(body.principal) : undefined,
      currency:        body.currency || undefined,
      interestRate:    body.interestRate != null ? parseFloat(body.interestRate) : null,
      issueDate:       body.issueDate ? new Date(body.issueDate) : undefined,
      maturityDate:    body.maturityDate ? new Date(body.maturityDate) : null,
      isConvertible:   body.isConvertible ?? undefined,
      conversionTerms: body.conversionTerms || null,
      status:          body.status || undefined,
      notes:           body.notes || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ loanId: string }> }) {
  const auth = await requireAuth(['super_admin', 'admin']);
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  const { loanId } = await params;

  const loan = await fetchAndVerify(loanId, ctx.organisationId);
  if (!loan) {
    return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
  }

  await prisma.shareholderLoan.delete({ where: { id: loanId } });
  return NextResponse.json({ ok: true });
}
