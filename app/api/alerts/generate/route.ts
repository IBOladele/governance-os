import { NextResponse } from 'next/server';
import { generateAlerts, updateAllHealthScores } from '@/lib/alertEngine';
import { requireAdmin } from '@/lib/auth/require';

// POST only — GET removed (was an unauthenticated side-effect trigger)
export async function POST() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { ctx } = auth;

  let alertResult = { created: 0, skipped: 0 };
  let healthError: string | null = null;
  let alertError:  string | null = null;

  try {
    // Scope alert generation to the caller's organisation
    alertResult = await generateAlerts(ctx.organisationId);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[alerts/generate] generateAlerts failed:', msg);
    alertError = msg;
  }

  try {
    // Scope health score updates to the caller's organisation
    await updateAllHealthScores(ctx.organisationId);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[alerts/generate] updateAllHealthScores failed:', msg);
    healthError = msg;
  }

  if (alertError && healthError) {
    return NextResponse.json({
      error: 'Both alert generation and health score update failed',
      alertError, healthError,
    }, { status: 500 });
  }

  return NextResponse.json({
    ...alertResult,
    ...(healthError ? { healthError } : {}),
    ...(alertError  ? { alertError  } : {}),
  });
}
