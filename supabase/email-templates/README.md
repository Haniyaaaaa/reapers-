# Reapers auth email templates

Branded HTML for the two auth emails this app actually sends — dark background, magenta/cyan
accent, matching the in-app palette (`src/theme/palettes.ts`). Table-based layout with inline
styles throughout, since Gmail/Outlook/Apple Mail strip `<style>` blocks and most modern CSS.

These are **not wired up automatically** — Supabase email templates live in your project's
dashboard, not in this repo's code, so installing them is a manual step you do once you have
a live project (same pattern as every other project-config item in this codebase's plan).

## Install

1. Supabase Dashboard → **Authentication → Email Templates**.
2. **Confirm signup** → paste the contents of `confirm-signup.html` into the source/HTML editor.
3. **Reset password** → paste the contents of `reset-password.html`.
4. Save each.

## Why these show `{{ .Token }}`, not just a link

Supabase's default templates only show `{{ .ConfirmationURL }}` (a clickable link). Both of
this app's in-app screens instead ask the user to type a 6-digit code back into the app —
that's `{{ .Token }}`, the same underlying value, just displayed as a short code instead of a
link. `confirm-signup.html` (`VerifyEmailScreen.tsx`) shows the code plus the link as a
fallback for anyone reading the email on the same device; `reset-password.html`
(`ResetPasswordScreen.tsx`) shows the code only, with no link at all, by design.

## Logo

Both templates use a text wordmark ("REAPERS") rather than an `<img>` — the app's actual logo
(`assets/logo.jpeg`) is a local bundled asset with no public URL to reference from an email.
If you want the real logo, host it somewhere public (e.g. Supabase Storage's public bucket, or
any CDN) and swap the wordmark `<span>` for an `<img src="https://.../logo.png" width="48" height="48" style="border-radius:12px;" alt="Reapers" />`.

## Variables reference (Supabase)

| Template | Variables available |
|---|---|
| Confirm signup | `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}` |
| Reset password | `{{ .Token }}` used (also available: `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`) |

Only `confirm-signup.html` and `reset-password.html` are provided — magic-link and invite-user
templates aren't included because this app doesn't use either flow (email/password + Google/
Apple OAuth only, per `src/services/supabase/auth.ts`).
