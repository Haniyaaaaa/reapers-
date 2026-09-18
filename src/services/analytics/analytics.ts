import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

let posthogClient: PostHog | null = null;

/**
 * Both SDKs are entirely optional and gated on their env var being set — a dev/local run
 * with no `EXPO_PUBLIC_SENTRY_DSN`/`EXPO_PUBLIC_POSTHOG_KEY` in `.env` does nothing here,
 * so nothing breaks for anyone who hasn't created their own Sentry/PostHog project yet.
 */
export function initAnalytics() {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({ dsn: sentryDsn, tracesSampleRate: 0.2 });
  }

  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    posthogClient = new PostHog(posthogKey, {
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    });
  }
}

/** Fire-and-forget event tracking — safe to call from anywhere (store actions included, not
 * just components), since it doesn't depend on React context. */
export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  posthogClient?.capture(event, properties ?? undefined);
}

export function identifyUser(userId: string) {
  posthogClient?.identify(userId);
  Sentry.setUser({ id: userId });
}

export function clearIdentity() {
  posthogClient?.reset();
  Sentry.setUser(null);
}

/** Safe to call even when EXPO_PUBLIC_SENTRY_DSN was never set — Sentry's SDK no-ops
 * internally when uninitialized rather than throwing. Used by ErrorBoundary.
 *
 * Every store action in this app calls this on failure instead of letting errors surface, so
 * without a console.error here a real failure (bad query, RLS rejection, network error) is
 * completely silent in the Metro/device log — the UI just shows a generic "Could not load"
 * banner with nothing to grep for. Logging first, unconditionally, is what makes this
 * debuggable at all without a live Sentry project configured. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  console.error('[captureException]', error, context ?? '');
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
