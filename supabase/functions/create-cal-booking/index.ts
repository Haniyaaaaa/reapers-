// Auto-fills a booking's meeting link via Cal.com instead of the expert typing one in by hand
// after the fact (the old flow — see MyBookingsScreen's "Set meeting link"). Called from the
// app right after a successful expertsApi.bookSlot() via
// supabase.functions.invoke('create-cal-booking', { body: { bookingId } }), JWT-authenticated,
// same pattern as safepay-create-checkout.
//
// Only does anything if the expert has linked a Cal.com event (experts.cal_username +
// cal_event_slug, set from BecomeExpertScreen — see ExpertApplicationFields.tsx). If they
// haven't, this quietly no-ops and the existing manual "Set meeting link" flow still works
// exactly as before — this is additive, not a replacement for experts who don't use Cal.com.
//
// IMPORTANT — not verified against a live Cal.com account: this calls Cal.com's v2 Bookings API
// (POST /v2/bookings) with the request shape documented at https://cal.com/docs/api-reference
// as of this writing (attendee + start + eventTypeSlug + username). Cal.com's API has changed
// shape across versions before; if bookings start failing here, check the response body this
// function logs and compare against Cal.com's current API reference — the failure is caught and
// swallowed (the booking itself already succeeded; only the auto-fill is best-effort), so a
// broken integration fails silently rather than blocking anyone from booking a session.
//
// Requires Edge Function secrets:
//   supabase secrets set CAL_COM_API_KEY=<your Cal.com API key, from Settings > Developer > API Keys>

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CAL_API_BASE = 'https://api.cal.com/v2';
const CAL_API_VERSION = '2024-08-13';

type RequestBody = { bookingId?: string };

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser();
  if (getUserError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as RequestBody;
  if (!body.bookingId) {
    return new Response(JSON.stringify({ error: 'Missing bookingId' }), { status: 400 });
  }

  // service_role: the meeting-link write isn't something a plain authenticated client can do
  // for a booking that might not be theirs to update (e.g. the expert setting it on the
  // requester's behalf), and reading the expert's cal_username shouldn't depend on either
  // party's own row visibility.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .select('id, starts_at, expert_id, requester_id, requester:profiles!bookings_requester_id_fkey(display_name)')
    .eq('id', body.bookingId)
    .maybeSingle();
  if (bookingErr || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 });
  }
  // Only a participant should be able to trigger this for a given booking.
  if (user.id !== booking.expert_id && user.id !== booking.requester_id) {
    return new Response(JSON.stringify({ error: 'Not a participant on this booking' }), { status: 403 });
  }

  const { data: expert } = await admin.from('experts').select('cal_username, cal_event_slug').eq('id', booking.expert_id).maybeSingle();
  if (!expert?.cal_username || !expert?.cal_event_slug) {
    // No Cal.com linked — not an error, just nothing to do here.
    return new Response(JSON.stringify({ skipped: true, reason: 'expert has no Cal.com event linked' }), { status: 200 });
  }

  const apiKey = Deno.env.get('CAL_COM_API_KEY');
  if (!apiKey) {
    console.error('create-cal-booking: CAL_COM_API_KEY is not set');
    return new Response(JSON.stringify({ skipped: true, reason: 'Cal.com not configured' }), { status: 200 });
  }

  const { data: requesterAuth } = await admin.auth.admin.getUserById(booking.requester_id);
  const attendeeEmail = requesterAuth?.user?.email;
  if (!attendeeEmail) {
    return new Response(JSON.stringify({ skipped: true, reason: 'requester has no email on file' }), { status: 200 });
  }
  const requesterName =
    (booking as unknown as { requester?: { display_name?: string } }).requester?.display_name ?? 'Reapers member';

  try {
    const calRes = await fetch(`${CAL_API_BASE}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'cal-api-version': CAL_API_VERSION,
      },
      body: JSON.stringify({
        start: booking.starts_at,
        eventTypeSlug: expert.cal_event_slug,
        username: expert.cal_username,
        attendee: {
          name: requesterName,
          email: attendeeEmail,
          timeZone: 'UTC',
        },
        metadata: { reapersBookingId: booking.id },
      }),
    });

    const calBody = await calRes.json().catch(() => null);
    if (!calRes.ok) {
      console.error('create-cal-booking: Cal.com API error', calRes.status, JSON.stringify(calBody));
      return new Response(JSON.stringify({ skipped: true, reason: 'Cal.com API error', detail: calBody }), { status: 200 });
    }

    // Cal.com's response shape for the video/meeting link has moved around between versions
    // (top-level `location`, nested `data.location`, or a `references[].meetingUrl` entry
    // depending on the conferencing integration) — check a few known shapes rather than
    // assuming one.
    const data = (calBody as Record<string, unknown>)?.data ?? calBody;
    const meetingLink =
      (data as Record<string, unknown>)?.location ??
      (Array.isArray((data as Record<string, unknown>)?.references)
        ? ((data as { references: { meetingUrl?: string }[] }).references.find((r) => r.meetingUrl)?.meetingUrl)
        : undefined);

    if (typeof meetingLink === 'string' && meetingLink.startsWith('http')) {
      await admin.from('bookings').update({ meeting_link: meetingLink }).eq('id', booking.id);
      return new Response(JSON.stringify({ ok: true, meetingLink }), { status: 200 });
    }

    console.error('create-cal-booking: no usable meeting link in Cal.com response', JSON.stringify(calBody));
    return new Response(JSON.stringify({ skipped: true, reason: 'no meeting link in Cal.com response' }), { status: 200 });
  } catch (err) {
    console.error('create-cal-booking: request to Cal.com failed', err);
    return new Response(JSON.stringify({ skipped: true, reason: 'request to Cal.com failed' }), { status: 200 });
  }
});
