drop policy if exists "users_insert_authenticated_self" on public.users;

create policy "users_insert_authenticated_self"
on public.users for insert
to authenticated
with check (clerk_id = public.current_clerk_id());