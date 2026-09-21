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

Both templates show the real logo as an `<img>` pointing at
`https://azkfsilyttbbpsdiqgnn.supabase.co/storage/v1/object/public/brand/logo.png`. The
optimized file is `logo.png` in this folder (192px, transparent) — upload it once:

1. Supabase Dashboard → **Storage → New bucket**, name it `brand`, tick **Public bucket**.
2. Upload `logo.png` to the bucket root.

Until it's uploaded the image won't load and email clients show the "REAPERS" alt text instead.

## Variables reference (Supabase)

| Template | Variables available |
|---|---|
| Confirm signup | `{{ .Token }}`, `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}` |
| Reset password | `{{ .Token }}` used (also available: `{{ .ConfirmationURL }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`) |

Only `confirm-signup.html` and `reset-password.html` are provided — magic-link and invite-user
templates aren't included because this app doesn't use either flow (email/password + Google/
Apple OAuth only, per `src/services/supabase/auth.ts`).
