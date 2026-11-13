-- User-managed audio categories.
create table if not exists public.audio_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
alter table public.audio_categories enable row level security;
drop policy if exists "Users manage their own audio categories" on public.audio_categories;
create policy "Users manage their own audio categories"
  on public.audio_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
