/** Supabase enforces its own OTP resend rate limit server-side (independent of and often
 * longer than any cooldown a screen guesses on its own), and its error message states the
 * real remaining wait, e.g. "For security purposes, you can only request this after 37
 * seconds." Parsing that number and driving the on-screen countdown with it — instead of
 * always resetting to a fixed guess — is what keeps the countdown from finishing before the
 * server will actually accept another request. That mismatch was letting people tap "Resend"
 * the moment the guessed timer hit 0, which failed silently-ish (an error line easy to miss)
 * and read as "the second code never arrived".
 */
export function parseRateLimitSeconds(message: string | undefined | null): number | null {
  if (!message) return null;
  const m = message.match(/after\s+(\d+)\s*seconds?/i);
  return m ? parseInt(m[1], 10) : null;
}
