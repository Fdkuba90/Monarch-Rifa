-- Migración inicial: tabla de registros para la rifa Monarch.
-- Ejecutar una sola vez en Supabase > SQL Editor.

create table if not exists registros (
  id          bigserial primary key,
  creado_en   timestamptz not null default now(),
  nombre      text not null,
  celular     text not null unique,
  permiso     boolean not null default true
);

create index if not exists registros_creado_en_idx on registros (creado_en);

alter table registros enable row level security;

-- Sin policies a propósito: la tabla solo se toca con service_role
-- desde las funciones serverless (/api/registro y /api/participantes).
-- La anon key no puede leer ni escribir nada.
