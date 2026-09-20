-- AgendaCerta: vagas / confirmações (MVP)
create type public.appointment_status as enum (
  'pendente',
  'confirmado',
  'liberado',
  'remarcacao_solicitada'
);

create table public.appointments (
  id text primary key,
  patient_name text not null,
  specialty text not null,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'pendente',
  phone_masked text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index appointments_scheduled_at_idx on public.appointments (scheduled_at);

create or replace function public.set_appointments_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_appointments_updated_at();

alter table public.appointments enable row level security;

-- Bloqueia anon/authenticated; service_role continua bypassando RLS nas API routes.
create policy "appointments_deny_anon"
  on public.appointments
  for all
  to anon
  using (false)
  with check (false);

create policy "appointments_deny_authenticated"
  on public.appointments
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.appointments is
  'Agendamentos AgendaCerta. RLS com deny para anon/authenticated; use service_role no servidor.';

insert into public.appointments (
  id,
  patient_name,
  specialty,
  scheduled_at,
  status,
  phone_masked
) values
  (
    'apt-001',
    'Ana Souza',
    'Neurologia',
    '2026-09-22T09:00:00-03:00',
    'pendente',
    '(79) 9****-1234'
  ),
  (
    'apt-002',
    'Bruno Lima',
    'Endocrinologia',
    '2026-09-22T10:30:00-03:00',
    'pendente',
    '(79) 9****-5678'
  ),
  (
    'apt-003',
    'Carla Mendes',
    'Oftalmologia',
    '2026-09-22T14:00:00-03:00',
    'pendente',
    '(79) 9****-9012'
  ),
  (
    'apt-004',
    'Diego Alves',
    'Ultrassonografia',
    '2026-09-23T08:15:00-03:00',
    'confirmado',
    '(79) 9****-3344'
  ),
  (
    'apt-005',
    'Elena Rocha',
    'Neurologia',
    '2026-09-23T11:00:00-03:00',
    'pendente',
    '(79) 9****-7788'
  ),
  (
    'apt-006',
    'Fábio Nunes',
    'Endocrinologia',
    '2026-09-23T15:45:00-03:00',
    'liberado',
    '(79) 9****-2211'
  );
