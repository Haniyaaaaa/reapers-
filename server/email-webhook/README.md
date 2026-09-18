# Reapers auth emails — Nodemailer + Supabase Auth Hook

Replaces Supabase's built-in (rate-limited on the free tier) auth email sending with your own
Nodemailer/SMTP send, using Supabase's **Send Email Auth Hook**. Supabase still generates the
OTP/token and manages the auth flow — it just stops sending the email itself, and instead POSTs
the event to a webhook URL you host, which sends the actual email however you want.

**This is a separate Node package, deliberately not part of the Expo app's dependency tree** —
Nodemailer, `standardwebhooks`, and Node built-ins like `http` aren't React-Native/Metro
compatible and must never end up in the mobile bundle. It lives in this repo (`server/email-webhook/`)
as a sibling to `src/`, the same way `supabase/functions/` is a separate Deno runtime sitting
alongside the app — versioned together, deployed separately. The root `tsconfig.json` excludes
`server` so the app's typecheck never reaches in here, and this folder's `node_modules`/`.env`
are separately gitignored.

- `email-templates.mjs` — the two branded HTML builders (dark background, magenta/cyan accent,
  matching `src/theme/palettes.ts` in the app).
- `email-webhook-core.mjs` — the framework-agnostic core: verify the webhook signature, pick
  the right template, send via Nodemailer.
- `server-example.mjs` — a minimal example wrapper using Node's built-in `http` (not a
  framework requirement — see the comment at the top for one-line Express/Fastify/Next.js
  adapters; wire `handleSendEmailWebhook()` into whatever router you deploy this behind).
- `package.json` — its own dependency tree (`nodemailer`, `standardwebhooks`), independent of
  the root Expo app's `package.json`.

## Setup

1. `cd server/email-webhook && npm install`.
2. Copy `.env.example` to `.env` and fill in real values (all provider-agnostic SMTP — works
   with Gmail SMTP, Amazon SES, Mailgun, Postmark, or your own mail server). Using Gmail
   specifically: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, and `SMTP_PASS` must be a
   16-character **App Password** (Google Account > Security > App passwords) — your normal
   Gmail password won't work over SMTP.
3. Deploy this service (with its endpoint reachable at a public HTTPS URL) — a small Node app,
   host it wherever you host backend services (Render/Railway/Fly/a VPS/etc.). `npm start` runs
   the example server locally on `PORT` (default 3000) at `/auth-email-hook`.
4. In the **Supabase Dashboard** (once you've attached your project) → **Authentication →
   Hooks** → enable **"Send Email"** hook → set its URL to your deployed endpoint (e.g.
   `https://your-backend.example.com/auth-email-hook`) → Supabase shows a signing secret
   (`v1,whsec_...`) the moment you enable it — copy that into `SUPABASE_AUTH_HOOK_SECRET` in `.env`.

From that point on, Supabase calls your endpoint for every signup-confirmation and
password-reset email instead of sending them itself — no more free-tier rate limit on auth
emails, and you fully control deliverability/branding.

## What doesn't change in the app itself

Nothing in `src/services/supabase/auth.ts` (in the app root, `../../src/services/supabase/auth.ts`
relative to here) needs to change — `signUp()`, `resetPasswordForEmail()`, and `verifyOtp()` all
still work exactly the same from the app's point of view. This is purely a "who sends the email"
swap on Supabase's side; the app never talks to this service directly.

## Verifying it end-to-end

Once wired up: sign up with a fresh email in the app → this service receives the POST → check
its logs for a 200 and the recipient's inbox for the branded code email. If you get a 401, the
signature check failed — almost always `SUPABASE_AUTH_HOOK_SECRET` not matching what's shown in
the dashboard, or a proxy/framework in front of the handler that already parsed/re-serialized
the JSON body before it reached `handleSendEmailWebhook` (the raw bytes must be passed through
unchanged for the signature to verify).
