-- RF-019 / RF-028: reusable templates.
--
-- Two different things, deliberately stored differently.
--
-- The narrative template (conversacion, comparacion, llamada...) is a fixed
-- set enumerated by the requirement itself, so it lives in code and only its
-- name is kept on the video. Putting five known shapes in a table would buy
-- nothing and cost a join on every read.
--
-- The brand template is the opposite: the business invents its own, so it
-- needs a table.

alter table public.videos
    add column if not exists template text not null default 'libre';

alter table public.videos
    drop constraint if exists videos_template_check;

alter table public.videos
    add constraint videos_template_check
    check (template in ('libre', 'conversacion', 'explicacion', 'comparacion', 'llamada', 'presentacion'));

create table if not exists public.brand_templates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete cascade,
    name text not null,
    branding jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists brand_templates_user_id_idx on public.brand_templates (user_id, created_at desc);

alter table public.brand_templates enable row level security;

-- Mirrors the policies on videos: this is an internal single-tenant tool and
-- access control happens in the API layer, so the service role is what reads
-- and writes here.
drop policy if exists "brand_templates_owner_all" on public.brand_templates;
create policy "brand_templates_owner_all" on public.brand_templates
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
