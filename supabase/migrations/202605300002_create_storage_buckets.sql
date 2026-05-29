insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('resources', 'resources', true),
  ('room-attachments', 'room-attachments', true)
on conflict (id) do nothing;