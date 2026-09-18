-- The connections table was never added to the supabase_realtime publication, so accepting/
-- declining a connection request never pushed to either side's client — both parties had to
-- manually refresh (leave and refocus a screen) to see the Connect button/status update.
alter publication supabase_realtime add table public.connections;
