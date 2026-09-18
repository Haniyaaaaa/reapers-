// Deletes the calling user's own account. Not deployed by this codebase — the user runs
// `supabase functions deploy delete-account` against their own project when ready, same as
// dispatch-push. Called from the app via supabase.functions.invoke('delete-account'), which
// automatically forwards the caller's session JWT in the Authorization header.
//
// auth.admin.deleteUser requires the service-role key — the client can never call it
// directly, which is why this needs to be an Edge Function rather than a client-side call.
// Every table with `references public.profiles(id) on delete cascade` (all of them, per the
// migrations) cleans itself up automatically once auth.users is deleted.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 });
  }

  // Client bound to the caller's own JWT — used only to resolve *who* is calling, never to
  // perform the deletion itself (that needs the service-role client below).
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

  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
