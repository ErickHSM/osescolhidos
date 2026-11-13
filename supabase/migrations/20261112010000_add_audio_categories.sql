-- Add user-selectable categories to audio items.
alter table public.items
  add column if not exists category text not null default 'outros';

update public.items
set category = 'outros'
where category is null or category = '';
