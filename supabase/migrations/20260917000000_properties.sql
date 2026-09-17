create table if not exists public.properties (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    location text not null,
    price numeric not null default 0,
    type text not null default 'Casa',
    beds int not null default 0,
    baths int not null default 0,
    area numeric not null default 0,
    image text not null default '',
    tag text not null default '',
    stock int not null default 1,
    status text not null default 'activa' check (status in ('activa', 'reservada', 'vendida', 'arrendada')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.properties enable row level security;

drop policy if exists "Public can read active properties" on public.properties;
create policy "Public can read active properties"
    on public.properties for select
    using (status = 'activa' and stock > 0);

-- No insert/update/delete policies: writes only happen via the service-role
-- client from the admin API routes, which bypasses RLS entirely.
