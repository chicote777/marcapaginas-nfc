-- Marcapáginas NFC · esquema de base de datos
-- Pégalo en Supabase → SQL Editor → New query → Run

create extension if not exists "pgcrypto";

-- 1) Libros vinculados a una tarjeta NFC -------------------------------
create table public.libros_nfc (
  id               uuid primary key default gen_random_uuid(),
  tag_id           text not null unique,            -- ID que va en la URL de la tarjeta
  titulo           text not null,
  autor            text not null,
  total_paginas    int  not null check (total_paginas > 0),
  total_capitulos  int  not null check (total_capitulos between 1 and 200),
  pagina_actual    int  not null default 0,
  capitulo_actual  int  not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pagina_valida   check (pagina_actual between 0 and total_paginas),
  constraint capitulo_valido check (capitulo_actual between 1 and total_capitulos)
);

-- 2) Capítulos (se crean automáticamente al vincular el libro) ----------
create table public.capitulos (
  id        uuid primary key default gen_random_uuid(),
  libro_id  uuid not null references public.libros_nfc(id) on delete cascade,
  numero    int  not null check (numero > 0),
  titulo    text,                                    -- opcional, para ampliar más adelante
  unique (libro_id, numero)
);

-- 3) Notas y citas, ligadas a capítulo + página ------------------------
create table public.notas (
  id          uuid primary key default gen_random_uuid(),
  libro_id    uuid not null references public.libros_nfc(id) on delete cascade,
  capitulo_id uuid not null references public.capitulos(id) on delete cascade,
  pagina      int  not null check (pagina > 0),
  texto       text not null check (char_length(texto) between 1 and 4000),
  tipo        text not null default 'nota' check (tipo in ('nota', 'cita')),
  created_at  timestamptz not null default now()
);

create index notas_libro_pagina_idx on public.notas (libro_id, pagina);
create index capitulos_libro_idx    on public.capitulos (libro_id, numero);

-- 4) updated_at automático ------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger libros_set_updated_at
before update on public.libros_nfc
for each row execute function public.set_updated_at();

-- 5) Seguridad (RLS) -------------------------------------------------------
-- App personal sin login: la clave anon solo se usa desde el servidor de Next.js
-- (variables SUPABASE_URL / SUPABASE_ANON_KEY SIN prefijo NEXT_PUBLIC_).
alter table public.libros_nfc enable row level security;
alter table public.capitulos  enable row level security;
alter table public.notas      enable row level security;

create policy "acceso_total_libros"   on public.libros_nfc for all to anon using (true) with check (true);
create policy "acceso_total_capitulos" on public.capitulos for all to anon using (true) with check (true);
create policy "acceso_total_notas"     on public.notas     for all to anon using (true) with check (true);
