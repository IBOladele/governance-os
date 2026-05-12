import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma';

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ shareholderId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'super_admin') return forbidden();

  const { shareholderId } = await params;
  const body = await req.json();

  const shareholder = await prisma.shareholder.findUnique({ where: { id: shareholderId } });
  if (!shareholder) return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });

  const loan = await prisma.shareholderLoan.create({
    data: {
      entityId:       shareholder.entityId,
      shareholderId,
      principal:      parseFloat(body.principal),
      currency:       body.currency || 'USD',
      interestRate:   body.interestRate != null ? parseFloat(body.interestRate) : null,
      issueDate:      new Date(body.issueDate),
      maturityDate:   body.maturityDate ? new Date(body.maturityDate) : null,
      isConvertible:  body.isConvertible ?? false,
      conversionTerms: body.conversionTerms || null,
      status:         body.status || 'active',
      notes:          body.notes || null,
    },
  });

  return NextResponse.json(loan, { status: 201 });
}
