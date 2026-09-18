-- notify_team_application previously pointed applicants' "New team applicant"
-- notification at the generic Network screen; poster had to hunt for the request
-- and had no way to see who applied. Point it at the new TeamRequestApplicants
-- screen instead, carrying the team_request_id so the tap lands directly on the
-- applicant list (see src/features/network/screens/TeamRequestApplicantsScreen.tsx).
create or replace function public.notify_team_application()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  poster_id uuid;
  applicant_name text;
  project_name text;
begin
  select poster_id, project into poster_id, project_name from public.team_requests where id = new.team_request_id;
  select display_name into applicant_name from public.profiles where id = new.applicant_id;
  if poster_id is not null then
    insert into public.notifications (user_id, title, body, target)
    values (
      poster_id,
      'New team applicant',
      coalesce(applicant_name, 'Someone') || ' applied to ' || coalesce(project_name, 'your team request') || '.',
      jsonb_build_object('screen', 'TeamRequestApplicants', 'id', new.team_request_id)
    );
  end if;
  return new;
end;
$$;
