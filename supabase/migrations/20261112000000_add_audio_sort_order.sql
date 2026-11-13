-- Add a persistent manual order for audio items.
alter table public.items
  add column if not exists sort_order integer not null default 0;

with ranked_audio as (
  select id,
         row_number() over (partition by user_id order by created_at desc, id) - 1 as position
  from public.items
  where kind = 'audio'
)
update public.items as item
set sort_order = ranked_audio.position
from ranked_audio
where item.id = ranked_audio.id;
