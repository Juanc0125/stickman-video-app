alter table public.videos add column if not exists platform text not null default 'reels' check (platform in ('reels','tiktok','shorts'));
alter table public.videos add column if not exists target_duration_seconds integer not null default 30;
alter table public.videos add column if not exists branding jsonb not null default '{"logo_url":null,"logo_position":"top-right","primary_color":"#17202a","secondary_color":"#ffffff","font_family":"Arial"}'::jsonb;
alter table public.videos add column if not exists source_video_id uuid references public.videos(id) on delete set null;
alter table public.videos drop column if exists source_url;

alter table public.scenes add column if not exists character text not null default 'generico' check (character in ('broker','cliente','pareja','hombre','mujer','generico'));
alter table public.scenes add column if not exists action text not null default 'hablar' check (action in ('hablar','caminar','senalar','sentarse','pensar','telefono','mostrar_objeto'));
alter table public.scenes add column if not exists prop text not null default 'ninguno' check (prop in ('ninguno','casa','carro','banco','telefono','documento','dinero','grafico','oficina'));
alter table public.scenes drop column if exists image_url;
