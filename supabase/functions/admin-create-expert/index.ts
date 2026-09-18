// Manually onboards a new Expert account (M10.4.3/M10.4.4 of the Onboarding & Admin Panel
// addendum): creates a real auth.users row + profile + a pre-verified experts row, and
// returns generated login credentials in the response for the admin to share once. Not
// deployed by this codebase — the user runs `supabase functions deploy admin-create-expert`
// against their own project when ready, same as delete-account/dispatch-push.
//
// auth.admin.createUser requires the service-role key, so this has to be an Edge Function.
// The caller's own JWT is used only to verify they're an admin before anything privileged
// happens — a non-admin (or unauthenticated) caller gets rejected before any user is created.

import { createClient } from 'jsr:@supabase/supabase-js@2';

function randomPassword(): string {
  // 16 random bytes, base64url-ish — plenty strong for a one-time credential the expert
  // is expected to change (or at least is free to reset) after first login.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 20) + 'Aa1!';
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: getUserError,
  } = await callerClient.auth.getUser();
  if (getUserError || !caller) {
    return new Response(JSON.stringify({ error: 'Invalid or expired session' }), { status: 401 });
  }

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .single();
  if (callerProfileError || !callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { email, username, firstName, lastName, role, company, bio, specialties, portfolioUrl, linkedinUrl } = body ?? {};
  if (!email || !username || !role || !bio) {
    return new Response(JSON.stringify({ error: 'email, username, role, and bio are required' }), { status: 400 });
  }

  const temporaryPassword = randomPassword();
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { username, first_name: firstName ?? '', last_name: lastName ?? '' },
  });
  if (createError || !created.user) {
    return new Response(JSON.stringify({ error: createError?.message ?? 'Could not create user' }), { status: 500 });
  }
  const userId = created.user.id;

  // handle_new_user already inserted a stub profile row off the auth.users trigger — mark
  // it approved (admin-vouched, skips the queue) rather than inserting a second row.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ approval_status: 'approved' })
    .eq('id', userId);
  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  const { error: expertError } = await adminClient.from('experts').insert({
    id: userId,
    role,
    company: company ?? '',
    bio,
    specialties: specialties ?? [],
    portfolio_url: portfolioUrl ?? null,
    linkedin_url: linkedinUrl ?? null,
    verified: true,
    verified_at: new Date().toISOString(),
    verified_by: caller.id,
  });
  if (expertError) {
    return new Response(JSON.stringify({ error: expertError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ email, temporaryPassword }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
