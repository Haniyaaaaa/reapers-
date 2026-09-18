-- notify_team_application (0034) declared a local variable named `poster_id`, identical to
-- team_requests.poster_id — its own `select poster_id, project into poster_id, project_name
-- from public.team_requests` is genuinely ambiguous (PL/pgSQL error 42702) every single time
-- this AFTER INSERT trigger fires, which rolls back the entire team_applicants insert. Every
-- "Request to Join" tap has been failing at the database level since this trigger existed.
create or replace function public.notify_team_application()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_poster_id uuid;
  applicant_name text;
  project_name text;
begin
  select t.poster_id, t.project into v_poster_id, project_name from public.team_requests t where t.id = new.team_request_id;
  select display_name into applicant_name from public.profiles where id = new.applicant_id;
  if v_poster_id is not null then
    insert into public.notifications (user_id, title, body, target)
    values (
      v_poster_id,
      'New team applicant',
      coalesce(applicant_name, 'Someone') || ' applied to ' || coalesce(project_name, 'your team request') || '.',
      jsonb_build_object('screen', 'TeamRequestApplicants', 'id', new.team_request_id)
    );
  end if;
  return new;
end;
$$;
