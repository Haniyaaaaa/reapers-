-- Widen role-promotion from "owner only" to "any room admin", like a WhatsApp group admin —
-- while making sure nobody (any admin, owner included by construction) can act on the owner's
-- own row. USING evaluates against the target row's *current* role (pre-write); WITH CHECK
-- evaluates the value being written — together they mean "an admin may update any non-owner
-- row, and may never write role='owner' through this path" (ownership only ever comes from
-- chatrooms_auto_join_creator at room creation).
drop policy "chatroom_members_update_role_by_owner" on public.chatroom_members;
create policy "chatroom_members_update_role_by_admin" on public.chatroom_members for update
  using (public.is_room_admin(chatroom_id, auth.uid()) and role <> 'owner')
  with check (role <> 'owner');

-- Same "never touch the owner row" hardening for removal — chatroom_members_delete_by_admin
-- already allowed any admin (not just the owner) to remove members, it just never explicitly
-- excluded the owner's own row.
drop policy "chatroom_members_delete_by_admin" on public.chatroom_members;
create policy "chatroom_members_delete_by_admin" on public.chatroom_members for delete
  using (public.is_room_admin(chatroom_id, auth.uid()) and role <> 'owner');
 