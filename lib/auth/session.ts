import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './config';

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
