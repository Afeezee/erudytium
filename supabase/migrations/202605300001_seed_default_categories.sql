insert into public.categories (name, slug, department)
values
  ('Computer Science', 'computer-science', 'Computer Science'),
  ('Engineering', 'engineering', 'Engineering'),
  ('Mathematics', 'mathematics', 'Mathematics'),
  ('Sciences', 'sciences', 'Sciences'),
  ('General Studies', 'general-studies', 'General'),
  ('Arts and Social Sciences', 'arts-and-social-sciences', 'Arts and Social Sciences')
on conflict (name) do nothing;