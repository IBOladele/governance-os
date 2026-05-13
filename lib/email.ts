/**
 * Email sending utility — EntityOS
 *
 * Primary provider: AWS SES (via @aws-sdk/client-ses)
 * Fallback:         console.log (dev/staging without credentials)
 *
 * Required environment variables for AWS SES:
 *   AWS_SES_REGION            — e.g. "eu-west-1" or "us-east-1"
 *   AWS_SES_ACCESS_KEY_ID     — IAM user access key (ses:SendEmail permission)
 *   AWS_SES_SECRET_ACCESS_KEY — IAM user secret key
 *   EMAIL_FROM                — Verified SES sender address,
 *                               e.g. "EntityOS <noreply@yourdomain.com>"
 *                               The domain/address must be verified in SES.
 */

import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.EMAIL_FROM ?? 'EntityOS <noreply@entityos.io>';

// Lazily construct the SES client so missing env vars don't crash at module load.
let _ses: SESClient | null = null;

function getSESClient(): SESClient {
  if (!_ses) {
    _ses = new SESClient({
      region: process.env.AWS_SES_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId:     process.env.AWS_SES_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _ses;
}

async function sendViaSES(payload: EmailPayload): Promise<void> {
  const input: SendEmailCommandInput = {
    Source: FROM,
    Destination: { ToAddresses: [payload.to] },
    Message: {
      Subject: { Data: payload.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: payload.html, Charset: 'UTF-8' },
        ...(payload.text ? { Text: { Data: payload.text, Charset: 'UTF-8' } } : {}),
      },
    },
  };
  await getSESClient().send(new SendEmailCommand(input));
}

/**
 * Send an email via AWS SES.
 * Falls back to console.log when SES credentials are not configured — the
 * link is printed so you can test the flow locally without AWS.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY) {
      await sendViaSES(payload);
      return;
    }
    // Dev fallback — print to console so you can copy the link
    console.log(
      '\n📧 ─── EMAIL (AWS SES not configured) ──────────────────────────\n' +
      `To:      ${payload.to}\n` +
      `Subject: ${payload.subject}\n` +
      `────────────────────────────────────────────────────────────────\n` +
      (payload.text ?? payload.html.replace(/<[^>]+>/g, '')) +
      '\n────────────────────────────────────────────────────────────────\n'
    );
  } catch (err) {
    console.error('[email] SES send failed:', err);
    // Do not re-throw — a failed email should never crash an API route.
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
