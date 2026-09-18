import { supabase } from './client';

/** Invokes the delete-account Edge Function (supabase/functions/delete-account) — the
 * client can never call auth.admin.deleteUser directly (needs the service-role key), so
 * this has to go through a function. supabase.functions.invoke automatically forwards the
 * caller's session JWT, which is how the function knows whose account to delete (never a
 * client-supplied id). Not deployed by this codebase — see that function's own comment. */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
