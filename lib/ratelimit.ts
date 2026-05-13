/**
 * Rate-limiting abstraction — EntityOS
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 * are configured (recommended for production / multi-instance deployments).
 * Falls back to a per-process in-memory Map otherwise.
 *
 * Environment variables (optional — in-memory used if absent):
 *   UPSTASH_REDIS_REST_URL    — e.g. https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  — Upstash REST token
 */

// ─── In-memory fallback ───────────────────────────────────────────────────────
const store = new Map<string, { count: number; resetAt: number }>();

async function inMemoryCheck(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  entry.count++;
  return entry.count > max;
}

// ─── Upstash Redis (fixed-window counter via REST pipeline) ───────────────────
async function upstashCheck(key: string, max: number, windowMs: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', windowKey],
        ['EXPIRE', windowKey, windowSec],
      ]),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}`);
    const [[count]] = await res.json() as [[number]];
    return count > max;
  } catch (err) {
    // If Redis is unreachable, degrade to in-memory rather than blocking all traffic
    console.warn('[ratelimit] Upstash unavailable, falling back to in-memory:', err);
    return inMemoryCheck(key, max, windowMs);
  }
}

/**
 * Returns `true` if the caller has exceeded the rate limit.
 *
 * @param key       Unique key (e.g. `signup:${ip}`)
 * @param max       Max requests allowed per window
 * @param windowMs  Window duration in milliseconds
 */
export async function isRateLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return upstashCheck(key, max, windowMs);
  }
  return inMemoryCheck(key, max, windowMs);
}
