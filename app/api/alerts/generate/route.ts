import { NextResponse } from 'next/server';
import { generateAlerts, updateAllHealthScores } from '@/lib/alertEngine';

export async function POST() {
  let alertResult = { created: 0, skipped: 0 };
  let healthError: string | null = null;
  let alertError: string | null = null;

  // Run alert generation
  try {
    alertResult = await generateAlerts();
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[alerts/generate] generateAlerts failed:', msg);
    alertError = msg;
  }

  // Run health score update (independently — don't let it block alerts)
  try {
    await updateAllHealthScores();
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    console.error('[alerts/generate] updateAllHealthScores failed:', msg);
    healthError = msg;
  }

  // If both failed, return 500 with details
  if (alertError && healthError) {
    return NextResponse.json({
      error: 'Both alert generation and health score update failed',
      alertError,
      healthError,
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    alerts: alertResult,
    message: `Created ${alertResult.created} new alerts, skipped ${alertResult.skipped} duplicates. Health scores updated.`,
    ...(alertError ? { alertWarning: alertError } : {}),
    ...(healthError ? { healthWarning: healthError } : {}),
  });
}

// Allow GET for easy triggering from browser
export async function GET() {
  return POST();
}
