create or replace function public.is_room_member(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.room_members
      where room_id = target_room_id
        and user_id = public.current_app_user_id()
    ),
    false
  );
$$;

create or replace function public.can_access_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.study_rooms
      where id = target_room_id
        and not is_private
    )
    or public.is_room_member(target_room_id),
    false
  );
$$;

create or replace function public.can_manage_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.room_members
      where room_id = target_room_id
        and user_id = public.current_app_user_id()
        and role in ('owner', 'moderator')
    ),
    false
  );
$$;

create or replace function public.can_post_to_room(target_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.room_members
      where room_id = target_room_id
        and user_id = public.current_app_user_id()
        and is_muted = false
    ),
    false
  );
$$;

drop policy if exists "study_rooms_read_public_or_member" on public.study_rooms;
create policy "study_rooms_read_public_or_member"
on public.study_rooms for select
to authenticated
using (public.can_access_room(id));

drop policy if exists "room_members_read_room_members" on public.room_members;
create policy "room_members_read_room_members"
on public.room_members for select
to authenticated
using (public.is_room_member(room_id) or public.is_admin());

drop policy if exists "room_members_update_owner_or_moderator" on public.room_members;
create policy "room_members_update_owner_or_moderator"
on public.room_members for update
to authenticated
using (public.can_manage_room(room_id))
with check (public.can_manage_room(room_id));

drop policy if exists "room_members_delete_self_or_manager" on public.room_members;
create policy "room_members_delete_self_or_manager"
on public.room_members for delete
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.can_manage_room(room_id)
);

drop policy if exists "messages_read_room_members" on public.messages;
create policy "messages_read_room_members"
on public.messages for select
to authenticated
using (public.is_room_member(room_id) or public.is_admin());

drop policy if exists "messages_insert_room_members_not_muted" on public.messages;
create policy "messages_insert_room_members_not_muted"
on public.messages for insert
to authenticated
with check (
  user_id = public.current_app_user_id()
  and public.can_post_to_room(room_id)
);

drop policy if exists "messages_update_owner_or_moderator" on public.messages;
create policy "messages_update_owner_or_moderator"
on public.messages for update
to authenticated
using (public.can_manage_room(room_id))
with check (public.can_manage_room(room_id));