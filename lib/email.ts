/**
 * Email sending utility — EntityOS
 *
 * Supports Resend (preferred) via RESEND_API_KEY env var.
 * Falls back to SMTP via SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_PORT.
 * Falls back to console.log in dev when neither is configured — the link
 * is printed so you can test without an email provider.
 *
 * Environment variables:
 *   RESEND_API_KEY     — Resend API key (resend.com — free tier available)
 *   EMAIL_FROM         — "From" address, default: "EntityOS <noreply@entityos.io>"
 *   SMTP_HOST          — SMTP server hostname (alternative to Resend)
 *   SMTP_PORT          — SMTP port (default 587)
 *   SMTP_USER          — SMTP username
 *   SMTP_PASS          — SMTP password
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.EMAIL_FROM ?? 'EntityOS <noreply@entityos.io>';

async function sendViaResend(payload: EmailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to:   payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

async function sendViaSMTP(payload: EmailPayload): Promise<void> {
  // Lazy-import nodemailer so it's only loaded when SMTP is configured.
  // If you use Resend, nodemailer is never required.
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: (process.env.SMTP_PORT ?? '587') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: FROM,
    to:   payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

/**
 * Send an email. Automatically selects the best available provider.
 * In dev/staging with no provider configured, prints to console.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (process.env.RESEND_API_KEY) {
      await sendViaResend(payload);
      return;
    }
    if (process.env.SMTP_HOST) {
      await sendViaSMTP(payload);
      return;
    }
    // Dev fallback — print to console so you can copy the link
    console.log(
      '\n📧 ─── EMAIL (no provider configured) ───────────────────────────\n' +
      `To:      ${payload.to}\n` +
      `Subject: ${payload.subject}\n` +
      `─────────────────────────────────────────────────────────────────\n` +
      (payload.text ?? payload.html.replace(/<[^>]+>/g, '')) +
      '\n─────────────────────────────────────────────────────────────────\n'
    );
  } catch (err) {
    console.error('[email] Send failed:', err);
    // Do not re-throw — a failed email should never crash an API route.
    // The caller should handle the UX (e.g. "check your inbox" is always shown).
  }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export function passwordResetEmail(resetUrl: string): EmailPayload['html'] {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1e293b;margin-bottom:8px">Reset your password</h2>
      <p style="color:#475569;margin-bottom:24px">
        We received a request to reset the password for your EntityOS account.
        Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Reset password
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">
        If you didn't request this, you can safely ignore this email.
        Your password will not change.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:11px">EntityOS · Entity Management Platform</p>
    </div>
  `;
}

export function verifyEmailTemplate(verifyUrl: string, name?: string): EmailPayload['html'] {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
      <h2 style="color:#1e293b;margin-bottom:8px">Verify your email address</h2>
      <p style="color:#475569;margin-bottom:8px">Hi${name ? ` ${name}` : ''},</p>
      <p style="color:#475569;margin-bottom:24px">
        Thanks for signing up for EntityOS. Click the button below to verify your
        email address and activate your account.
      </p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Verify email address
      </a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">
        This link expires in <strong>24 hours</strong>. If you didn't create an
        EntityOS account, you can safely ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="color:#94a3b8;font-size:11px">EntityOS · Entity Management Platform</p>
    </div>
  `;
}
