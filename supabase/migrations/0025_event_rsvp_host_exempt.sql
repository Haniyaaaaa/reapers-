-- Fix: 0024's tightened event_rsvps_insert_own/_update_own (blocking self-write of
-- status='going' on paid events, to close the application-flow bypass hole) also
-- accidentally blocked the HOST's own auto-RSVP when they create their own paid event
-- (eventStore.createEvent self-RSVPs the host as 'going' right after insert). The host
-- obviously doesn't need to prove payment to themselves — exempt host_id from the block.

drop policy "event_rsvps_insert_own" on public.event_rsvps;
create policy "event_rsvps_insert_own" on public.event_rsvps for insert
  with check (
    user_id = auth.uid()
    and (
      status <> 'going'
      or exists (select 1 from public.events e where e.id = event_id and (not e.paid or e.host_id = auth.uid()))
    )
  );

drop policy "event_rsvps_update_own" on public.event_rsvps;
create policy "event_rsvps_update_own" on public.event_rsvps for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (
      status <> 'going'
      or exists (select 1 from public.events e where e.id = event_id and (not e.paid or e.host_id = auth.uid()))
    )
  );
