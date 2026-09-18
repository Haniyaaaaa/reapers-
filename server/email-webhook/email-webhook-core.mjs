// Framework-agnostic core: verifies Supabase's "Send Email" Auth Hook request, builds the
// right branded email, and sends it via Nodemailer/SMTP — bypassing Supabase's own
// (rate-limited-on-free-tier) email sending entirely.
//
// This is a plain async function, not a route — wrap it in whatever server you already run
// (Express, Fastify, Nest, Next.js, raw http, anything). See server-example.mjs for the
// smallest possible wrapper, using Node's built-in http module.
//
// npm install nodemailer standardwebhooks

import nodemailer from 'nodemailer';
import { Webhook } from 'standardwebhooks';
import { buildConfirmSignupEmail, buildResetPasswordEmail } from './email-templates.mjs';

// --- Config: all from env vars, nothing hardcoded ---------------------------------------
// SUPABASE_AUTH_HOOK_SECRET: shown once when you enable the "Send Email" hook in
//   Supabase Dashboard > Authentication > Hooks — looks like "v1,whsec_...".
// SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM: your own mail provider's
//   credentials (Gmail SMTP, SES, Mailgun, Postmark, your own server — any of them work,
//   Nodemailer over SMTP is provider-agnostic).
const HOOK_SECRET = process.env.SUPABASE_AUTH_HOOK_SECRET;
const SMTP_FROM = process.env.SMTP_FROM || 'Reapers <no-reply@reapers.app>';

let transporter;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/**
 * Verifies and parses a Supabase Auth "Send Email" hook request.
 * @param {string} rawBody - the exact, unparsed request body (verification is signature-based
 *   over the raw bytes — do NOT JSON.parse before calling this, and make sure your framework
 *   doesn't already consume/re-serialize the body, which would break the signature check).
 * @param {Record<string, string>} headers - request headers (needs webhook-id,
 *   webhook-timestamp, webhook-signature — Supabase sends these automatically).
 * @returns {{ user: { email: string }, email_data: Record<string, string> }}
 */
function verifyAndParse(rawBody, headers) {
  if (!HOOK_SECRET) throw new Error('SUPABASE_AUTH_HOOK_SECRET is not set');
  const wh = new Webhook(HOOK_SECRET);
  // Throws if the signature doesn't match — this IS the auth check for this endpoint, since
  // it's a public URL Supabase calls; nothing else should be able to trigger an email send.
  return wh.verify(rawBody, headers);
}

/**
 * Supabase's email_action_type values: 'signup' | 'recovery' | 'invite' | 'magiclink' |
 * 'email_change'. Reapers only ever triggers 'signup' (email/password sign-up) and
 * 'recovery' (forgot-password) — see src/services/supabase/auth.ts. Anything else falls
 * back to a generic template rather than failing silently.
 */
function renderEmail(emailActionType, { token, confirmationUrl }) {
  switch (emailActionType) {
    case 'signup':
      return { subject: 'Confirm your Reapers account', html: buildConfirmSignupEmail({ token, confirmationUrl }) };
    case 'recovery':
      return { subject: 'Reset your Reapers password', html: buildResetPasswordEmail({ token }) };
    default:
      return {
        subject: 'Reapers verification code',
        html: buildConfirmSignupEmail({ token, confirmationUrl }), // reasonable default: show the code
      };
  }
}

/**
 * The one function to call from your server. Takes the raw request and returns a plain
 * { status, body } result — no framework types involved, so it works from any router.
 * @param {string} rawBody
 * @param {Record<string, string>} headers
 * @returns {Promise<{ status: number; body: string }>}
 */
export async function handleSendEmailWebhook(rawBody, headers) {
  let payload;
  try {
    payload = verifyAndParse(rawBody, headers);
  } catch (err) {
    return { status: 401, body: `Invalid webhook signature: ${err instanceof Error ? err.message : 'unknown error'}` };
  }

  const { user, email_data } = payload;
  const { token, token_hash, redirect_to, email_action_type, site_url } = email_data;

  // Supabase's documented verify-link format — a working fallback link even though the app's
  // own VerifyEmailScreen.tsx expects the user to type `token` in as a 6-digit code instead.
  const confirmationUrl = `${site_url}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${encodeURIComponent(email_action_type)}&redirect_to=${encodeURIComponent(redirect_to)}`;

  const { subject, html } = renderEmail(email_action_type, { token, confirmationUrl });

  try {
    await getTransporter().sendMail({ from: SMTP_FROM, to: user.email, subject, html });
  } catch (err) {
    // Supabase treats a non-2xx as "email failed to send" and surfaces an error to the app —
    // returning 500 here (rather than swallowing it) is the correct behavior, not a fallback
    // to silently succeed.
    return { status: 500, body: `Failed to send email: ${err instanceof Error ? err.message : 'unknown error'}` };
  }

  return { status: 200, body: JSON.stringify({ sent: true }) };
}
