-- RF-010: background music and sound effects.
--
-- A sound is referenced by a plain string ('biblioteca:<slug>' for the
-- project's own generated library, 'subido:<uuid>' for an upload), so the
-- video and scene columns are text with no foreign key: library sounds have
-- no row at all, and the app clears references itself when an upload is
-- deleted. A dangling id is harmless - the render resolves it to "no sound".

alter table public.videos add column if not exists music_id text;
alter table public.scenes add column if not exists sound_effect_id text;

-- Only uploads live here. The license is mandatory because RF-010 requires
-- audio cleared for commercial use, and the person uploading is the only one
-- who can say who holds those rights.
create table if not exists public.sound_assets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users (id) on delete cascade,
    kind text not null check (kind in ('musica', 'efecto')),
    name text not null,
    storage_path text not null,
    license text not null,
    created_at timestamptz not null default now()
);

create index if not exists sound_assets_user_id_idx on public.sound_assets (user_id, created_at desc);

alter table public.sound_assets enable row level security;

-- Same policy as brand_templates: internal single-tenant tool, access control
-- happens in the API layer, and the service role is what reads and writes.
drop policy if exists "sound_assets_owner_all" on public.sound_assets;
create policy "sound_assets_owner_all" on public.sound_assets
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
