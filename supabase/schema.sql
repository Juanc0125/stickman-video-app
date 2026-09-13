create extension if not exists "pgcrypto";

create type public.video_status as enum ('borrador', 'pendiente_aprobacion', 'aprobado', 'publicado');

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null check (char_length(topic) between 1 and 500),
  source_url text,
  script text not null default '',
  video_url text,
  status public.video_status not null default 'borrador',
  created_at timestamptz not null default now()
);

create table public.scenes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  "order" integer not null check ("order" > 0),
  description text not null,
  image_url text,
  audio_url text,
  duration_seconds numeric(8, 2) not null check (duration_seconds > 0)
);

alter table public.videos enable row level security;
alter table public.scenes enable row level security;

create policy "users can view their videos" on public.videos for select using (auth.uid() = user_id);
create policy "users can create their videos" on public.videos for insert with check (auth.uid() = user_id);
create policy "users can update their videos" on public.videos for update using (auth.uid() = user_id);
create policy "users can view their scenes" on public.scenes for select using (exists (select 1 from public.videos where videos.id = scenes.video_id and videos.user_id = auth.uid()));
create policy "users can create scenes for their videos" on public.scenes for insert with check (exists (select 1 from public.videos where videos.id = scenes.video_id and videos.user_id = auth.uid()));

create index videos_user_id_created_at_idx on public.videos(user_id, created_at desc);
create index scenes_video_id_order_idx on public.scenes(video_id, "order");