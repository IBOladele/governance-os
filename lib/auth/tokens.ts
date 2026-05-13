/**
 * Stateless HMAC tokens for password reset and email verification.
 *
 * No database table needed — the token is self-contained and single-use:
 * - Password reset tokens embed the first 12 chars of the user's bcrypt hash.
 *   Once the password is changed, the hash changes and the old token is invalid.
 * - Email verification tokens embed whether emailVerified is null.
 *   Once the email is verified, the token derived from the "unverified" state is invalid.
 *
 * Token format (base64url-encoded):
 *   userId|expiresAt|hmac
 *   HMAC = SHA-256(userId|expiresAt|nonce, NEXTAUTH_SECRET)
 */

import crypto from 'crypto';

function hmac(message: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function encode(userId: string, expiresAt: number, nonce: string): string {
  const sig = hmac(`${userId}|${expiresAt}|${nonce}`);
  return Buffer.from(`${userId}|${expiresAt}|${sig}`).toString('base64url');
}

// ─── Password Reset ───────────────────────────────────────────────────────────

/**
 * Create a 1-hour password-reset token.
 * @param userId        The user's ID
 * @param passwordHash  The user's current bcrypt hash (used as single-use nonce)
 */
export function createPasswordResetToken(userId: string, passwordHash: string): string {
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
  const nonce = passwordHash.slice(0, 12);
  return encode(userId, expiresAt, nonce);
}

/**
 * Verify a password-reset token.
 * Returns the userId on success, or null on invalid/expired/already-used token.
 * Requires the current password hash to guard against reuse after password change.
 */
export function verifyPasswordResetToken(
  token: string,
  currentPasswordHash: string,
): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const [userId, expiresAtStr, providedSig] = decoded.split('|');
    if (!userId || !expiresAtStr || !providedSig) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return null; // expired

    const nonce    = currentPasswordHash.slice(0, 12);
    const expected = hmac(`${userId}|${expiresAt}|${nonce}`);

    // Constant-time comparison to prevent timing attacks
    if (
      providedSig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expected))
    ) return null;

    return userId;
  } catch {
    return null;
  }
}

// ─── Email Verification ───────────────────────────────────────────────────────

/**
 * Create a 24-hour email verification token.
 * The nonce is 'unverified'; once emailVerified is set the token becomes invalid.
 */
export function createEmailVerificationToken(userId: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return encode(userId, expiresAt, 'unverified');
}

/**
 * Verify an email-verification token.
 * @param token         The token from the URL
 * @param isVerified    Whether the user's email is already verified (emailVerified !== null)
 */
export function verifyEmailToken(token: string, isVerified: boolean): string | null {
  try {
    if (isVerified) return null; // already verified — token is spent

    const decoded = Buffer.from(token, 'base64url').toString();
    const [userId, expiresAtStr, providedSig] = decoded.split('|');
    if (!userId || !expiresAtStr || !providedSig) return null;

    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return null; // expired

    const expected = hmac(`${userId}|${expiresAt}|unverified`);

    if (
      providedSig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expected))
    ) return null;

    return userId;
  } catch {
    return null;
  }
}
