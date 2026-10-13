insert into "categories" ("name", "slug", "department") values
  ('Computer Science', 'computer-science', 'Computing'),
  ('Mathematics', 'mathematics', 'Science'),
  ('Engineering', 'engineering', 'Engineering'),
  ('Business', 'business', 'Business'),
  ('Humanities', 'humanities', 'Arts'),
  ('Natural Sciences', 'natural-sciences', 'Science'),
  ('Health Sciences', 'health-sciences', 'Health'),
  ('Law', 'law', 'Law'),
  ('Education', 'education', 'Education'),
  ('Social Sciences', 'social-sciences', 'Social Sciences')
on conflict ("name") do nothing;
