import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// MED-12: return minimal status only — no internal DB details exposed publicly
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' })
  } catch {
    // Do not expose whether the DB is unreachable or what type of error occurred
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
