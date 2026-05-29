create extension if not exists "uuid-ossp";

create or replace function public.current_clerk_id()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'sub', '');
$$;

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  clerk_id text unique not null,
  name text,
  email text unique not null,
  role text not null default 'student' check (role in ('student', 'lecturer', 'admin')),
  department text,
  level text,
  bio text,
  avatar_url text,
  is_active boolean default true,
  user_preferences jsonb not null default '{"mentionAlerts":true,"resourceAlerts":true,"requestUpdates":true,"emailDigests":false}'::jsonb,
  created_at timestamptz default now()
);

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where clerk_id = public.current_clerk_id() limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where clerk_id = public.current_clerk_id() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.is_lecturer_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('lecturer', 'admin'), false);
$$;

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  slug text unique,
  department text,
  created_at timestamptz default now()
);

create table if not exists public.resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  file_url text not null,
  file_type text,
  file_size bigint,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] default '{}',
  uploaded_by uuid references public.users(id) on delete set null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  download_count int default 0,
  restricted_to text default 'all' check (restricted_to in ('all', 'lecturers_only', 'final_year_only')),
  created_at timestamptz default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored
);

create table if not exists public.bookmarks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, resource_id)
);

create table if not exists public.resource_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now(),
  unique(user_id, resource_id)
);

create table if not exists public.resource_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz default now()
);

create table if not exists public.study_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  topic text,
  is_private boolean default false,
  invite_code text unique,
  created_by uuid references public.users(id) on delete set null,
  exam_date timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.room_members (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text default 'member' check (role in ('owner', 'moderator', 'member')),
  is_muted boolean default false,
  joined_at timestamptz default now(),
  unique(room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  file_url text,
  is_pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  department text,
  created_at timestamptz default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_resources_category_id on public.resources(category_id);
create index if not exists idx_resources_uploaded_by on public.resources(uploaded_by);
create index if not exists idx_resources_status on public.resources(status);
create index if not exists idx_resources_search_vector on public.resources using gin(search_vector);
create index if not exists idx_bookmarks_user_id on public.bookmarks(user_id);
create index if not exists idx_bookmarks_resource_id on public.bookmarks(resource_id);
create index if not exists idx_resource_reviews_user_id on public.resource_reviews(user_id);
create index if not exists idx_resource_reviews_resource_id on public.resource_reviews(resource_id);
create index if not exists idx_resource_requests_user_id on public.resource_requests(user_id);
create index if not exists idx_study_rooms_created_by on public.study_rooms(created_by);
create index if not exists idx_room_members_room_id on public.room_members(room_id);
create index if not exists idx_room_members_user_id on public.room_members(user_id);
create index if not exists idx_messages_room_id on public.messages(room_id);
create index if not exists idx_messages_user_id on public.messages(user_id);
create index if not exists idx_messages_room_created_desc on public.messages(room_id, created_at desc);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_announcements_author_id on public.announcements(author_id);
create index if not exists idx_audit_logs_admin_id on public.audit_logs(admin_id);

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.resources enable row level security;
alter table public.bookmarks enable row level security;
alter table public.resource_reviews enable row level security;
alter table public.resource_requests enable row level security;
alter table public.study_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
on public.users for select
to authenticated
using (true);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users for update
to authenticated
using (id = public.current_app_user_id())
with check (id = public.current_app_user_id());

drop policy if exists "users_insert_service_role" on public.users;
create policy "users_insert_service_role"
on public.users for insert
to service_role
with check (true);

drop policy if exists "users_insert_authenticated_self" on public.users;
create policy "users_insert_authenticated_self"
on public.users for insert
to authenticated
with check (clerk_id = public.current_clerk_id());

drop policy if exists "categories_read_authenticated" on public.categories;
create policy "categories_read_authenticated"
on public.categories for select
to authenticated
using (true);

drop policy if exists "categories_manage_admin" on public.categories;
create policy "categories_manage_admin"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "resources_read_approved" on public.resources;
create policy "resources_read_approved"
on public.resources for select
to authenticated
using (
  status = 'approved'
  or uploaded_by = public.current_app_user_id()
  or public.is_admin()
);

drop policy if exists "resources_insert_authenticated" on public.resources;
create policy "resources_insert_authenticated"
on public.resources for insert
to authenticated
with check (uploaded_by = public.current_app_user_id());

drop policy if exists "resources_update_owner_or_admin" on public.resources;
create policy "resources_update_owner_or_admin"
on public.resources for update
to authenticated
using (uploaded_by = public.current_app_user_id() or public.is_admin())
with check (uploaded_by = public.current_app_user_id() or public.is_admin());

drop policy if exists "resources_delete_owner_or_admin" on public.resources;
create policy "resources_delete_owner_or_admin"
on public.resources for delete
to authenticated
using (uploaded_by = public.current_app_user_id() or public.is_admin());

drop policy if exists "bookmarks_own_crud" on public.bookmarks;
create policy "bookmarks_own_crud"
on public.bookmarks for all
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists "reviews_read_authenticated" on public.resource_reviews;
create policy "reviews_read_authenticated"
on public.resource_reviews for select
to authenticated
using (true);

drop policy if exists "reviews_own_write" on public.resource_reviews;
create policy "reviews_own_write"
on public.resource_reviews for all
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists "requests_insert_own" on public.resource_requests;
create policy "requests_insert_own"
on public.resource_requests for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists "requests_read_own_or_admin" on public.resource_requests;
create policy "requests_read_own_or_admin"
on public.resource_requests for select
to authenticated
using (user_id = public.current_app_user_id() or public.is_admin());

drop policy if exists "requests_update_own_or_admin" on public.resource_requests;
create policy "requests_update_own_or_admin"
on public.resource_requests for update
to authenticated
using (user_id = public.current_app_user_id() or public.is_admin())
with check (user_id = public.current_app_user_id() or public.is_admin());

drop policy if exists "study_rooms_read_public_or_member" on public.study_rooms;
create policy "study_rooms_read_public_or_member"
on public.study_rooms for select
to authenticated
using (
  not is_private
  or exists (
    select 1
    from public.room_members rm
    where rm.room_id = study_rooms.id
      and rm.user_id = public.current_app_user_id()
  )
  or public.is_admin()
);

drop policy if exists "study_rooms_insert_authenticated" on public.study_rooms;
create policy "study_rooms_insert_authenticated"
on public.study_rooms for insert
to authenticated
with check (created_by = public.current_app_user_id());

drop policy if exists "study_rooms_update_owner_or_admin" on public.study_rooms;
create policy "study_rooms_update_owner_or_admin"
on public.study_rooms for update
to authenticated
using (created_by = public.current_app_user_id() or public.is_admin())
with check (created_by = public.current_app_user_id() or public.is_admin());

drop policy if exists "study_rooms_delete_owner_or_admin" on public.study_rooms;
create policy "study_rooms_delete_owner_or_admin"
on public.study_rooms for delete
to authenticated
using (created_by = public.current_app_user_id() or public.is_admin());

drop policy if exists "room_members_read_room_members" on public.room_members;
create policy "room_members_read_room_members"
on public.room_members for select
to authenticated
using (
  exists (
    select 1
    from public.room_members existing_member
    where existing_member.room_id = room_members.room_id
      and existing_member.user_id = public.current_app_user_id()
  )
  or public.is_admin()
);

drop policy if exists "room_members_insert_self" on public.room_members;
create policy "room_members_insert_self"
on public.room_members for insert
to authenticated
with check (user_id = public.current_app_user_id());

drop policy if exists "room_members_update_owner_or_moderator" on public.room_members;
create policy "room_members_update_owner_or_moderator"
on public.room_members for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.room_members acting_member
    where acting_member.room_id = room_members.room_id
      and acting_member.user_id = public.current_app_user_id()
      and acting_member.role in ('owner', 'moderator')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.room_members acting_member
    where acting_member.room_id = room_members.room_id
      and acting_member.user_id = public.current_app_user_id()
      and acting_member.role in ('owner', 'moderator')
  )
);

drop policy if exists "room_members_delete_self_or_manager" on public.room_members;
create policy "room_members_delete_self_or_manager"
on public.room_members for delete
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.is_admin()
  or exists (
    select 1
    from public.room_members acting_member
    where acting_member.room_id = room_members.room_id
      and acting_member.user_id = public.current_app_user_id()
      and acting_member.role in ('owner', 'moderator')
  )
);

drop policy if exists "messages_read_room_members" on public.messages;
create policy "messages_read_room_members"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = public.current_app_user_id()
  )
  or public.is_admin()
);

drop policy if exists "messages_insert_room_members_not_muted" on public.messages;
create policy "messages_insert_room_members_not_muted"
on public.messages for insert
to authenticated
with check (
  user_id = public.current_app_user_id()
  and exists (
    select 1
    from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = public.current_app_user_id()
      and rm.is_muted = false
  )
);

drop policy if exists "messages_update_owner_or_moderator" on public.messages;
create policy "messages_update_owner_or_moderator"
on public.messages for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = public.current_app_user_id()
      and rm.role in ('owner', 'moderator')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.room_members rm
    where rm.room_id = messages.room_id
      and rm.user_id = public.current_app_user_id()
      and rm.role in ('owner', 'moderator')
  )
);

drop policy if exists "messages_delete_own_or_admin" on public.messages;
create policy "messages_delete_own_or_admin"
on public.messages for delete
to authenticated
using (user_id = public.current_app_user_id() or public.is_admin());

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
on public.notifications for select
to authenticated
using (user_id = public.current_app_user_id());

drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_insert_authenticated"
on public.notifications for insert
to authenticated
with check (true);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications for update
to authenticated
using (user_id = public.current_app_user_id())
with check (user_id = public.current_app_user_id());

drop policy if exists "announcements_read_authenticated" on public.announcements;
create policy "announcements_read_authenticated"
on public.announcements for select
to authenticated
using (true);

drop policy if exists "announcements_insert_lecturer_or_admin" on public.announcements;
create policy "announcements_insert_lecturer_or_admin"
on public.announcements for insert
to authenticated
with check (author_id = public.current_app_user_id() and public.is_lecturer_or_admin());

drop policy if exists "announcements_update_author_or_admin" on public.announcements;
create policy "announcements_update_author_or_admin"
on public.announcements for update
to authenticated
using (author_id = public.current_app_user_id() or public.is_admin())
with check (author_id = public.current_app_user_id() or public.is_admin());

drop policy if exists "announcements_delete_author_or_admin" on public.announcements;
create policy "announcements_delete_author_or_admin"
on public.announcements for delete
to authenticated
using (author_id = public.current_app_user_id() or public.is_admin());

drop policy if exists "audit_logs_read_admin" on public.audit_logs;
create policy "audit_logs_read_admin"
on public.audit_logs for select
to authenticated
using (public.is_admin());

drop policy if exists "audit_logs_insert_admin" on public.audit_logs;
create policy "audit_logs_insert_admin"
on public.audit_logs for insert
to authenticated
with check (admin_id = public.current_app_user_id() and public.is_admin());

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;