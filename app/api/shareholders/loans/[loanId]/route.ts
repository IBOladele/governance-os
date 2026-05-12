import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ loanId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { loanId } = await params;
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { loanId } = await params;
  await prisma.shareholderLoan.delete({ where: { id: loanId } });
  return NextResponse.json({ ok: true });
}
