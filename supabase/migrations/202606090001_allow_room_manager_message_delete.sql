drop policy if exists "messages_delete_own_or_admin" on public.messages;

create policy "messages_delete_own_or_manager_or_admin"
on public.messages for delete
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.is_admin()
  or public.can_manage_room(room_id)
);