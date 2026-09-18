-- Phase 23: abuse/rate-limit backstop. No rate limiting existed anywhere in the app —
-- Supabase's own rate limits only cover its Auth endpoints (signup/OTP/password-reset), not
-- generic table writes. A buggy client retry-loop or a malicious user could otherwise hammer
-- chat messages, comments, connection requests, team applications, reports, or support
-- messages as fast as the network allows. These limits are generous on purpose — an abuse
-- backstop, not a UX throttle — and reuse each table's existing created_at column rather than
-- adding a separate rate-limit-tracking table.

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql as $$
declare
  max_count int := TG_ARGV[0]::int;
  window_seconds int := TG_ARGV[1]::int;
  user_col text := TG_ARGV[2];
  user_val uuid;
  current_count int;
begin
  execute format('select ($1).%I', user_col) into user_val using new;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - make_interval(secs => $2)',
    tg_table_schema, tg_table_name, user_col
  ) into current_count using user_val, window_seconds;

  if current_count >= max_count then
    raise exception 'You are doing that too fast — wait a moment and try again.' using errcode = '55006';
  end if;

  return new;
end;
$$;

create trigger chatroom_messages_rate_limit
  before insert on public.chatroom_messages
  for each row execute function public.enforce_rate_limit(30, 10, 'sender_id');
create index chatroom_messages_sender_created_idx on public.chatroom_messages(sender_id, created_at);

create trigger demo_comments_rate_limit
  before insert on public.demo_comments
  for each row execute function public.enforce_rate_limit(5, 60, 'user_id');
create index demo_comments_user_created_idx on public.demo_comments(user_id, created_at);

create trigger connections_rate_limit
  before insert on public.connections
  for each row execute function public.enforce_rate_limit(20, 60, 'requester_id');
create index connections_requester_created_idx on public.connections(requester_id, created_at);

create trigger team_request_applications_rate_limit
  before insert on public.team_request_applications
  for each row execute function public.enforce_rate_limit(20, 60, 'applicant_id');
create index team_request_applications_applicant_created_idx on public.team_request_applications(applicant_id, created_at);

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_rate_limit(5, 60, 'reporter_id');
create index reports_reporter_created_idx on public.reports(reporter_id, created_at);

create trigger support_ticket_messages_rate_limit
  before insert on public.support_ticket_messages
  for each row execute function public.enforce_rate_limit(10, 60, 'sender_id');
create index support_ticket_messages_sender_created_idx on public.support_ticket_messages(sender_id, created_at);
