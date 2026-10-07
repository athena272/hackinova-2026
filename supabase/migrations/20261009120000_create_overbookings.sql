-- AgendaCerta: encaixe extra (overbooking) sugerido pelo score de falta.
-- A sugestão só aparece em blocos (especialidade + horário) com risco alto; a
-- recepção aceita ou recusa. Cada linha guarda essa decisão.

create type public.overbooking_decision as enum (
  'aceita',
  'recusada'
);

grant usage on type public.overbooking_decision to service_role;

create table public.overbookings (
  id text primary key,
  anchor_appointment_id text not null references public.appointments (id),
  specialty text not null,
  scheduled_at timestamptz not null,
  decision public.overbooking_decision not null,
  sequence smallint,
  encaixe_appointment_id text unique references public.appointments (id),
  risk_probability smallint not null,
  decided_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint overbookings_encaixe_iff_accepted check ((decision = 'aceita') = (encaixe_appointment_id is not null)),
  constraint overbookings_sequence_iff_accepted check ((decision = 'aceita') = (sequence is not null)),
  constraint overbookings_sequence_positive check (sequence is null or sequence >= 1),
  constraint overbookings_risk_probability_range check (risk_probability between 0 and 100)
);

-- Dois aceites ao mesmo tempo calculam o mesmo número de encaixe no bloco;
-- o segundo esbarra aqui e o limite por bloco não é furado.
create unique index overbookings_sequence_per_block
  on public.overbookings (specialty, scheduled_at, sequence)
  where decision = 'aceita';

-- Uma recusa por bloco: depois dela, o bloco não recebe mais sugestão.
create unique index overbookings_one_refusal_per_block
  on public.overbookings (specialty, scheduled_at)
  where decision = 'recusada';

create index overbookings_anchor_appointment_idx
  on public.overbookings (anchor_appointment_id);

create or replace function public.set_overbookings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger overbookings_set_updated_at
before update on public.overbookings
for each row
execute function public.set_overbookings_updated_at();

alter table public.overbookings enable row level security;

create policy "overbookings_deny_anon"
  on public.overbookings
  for all
  to anon
  using (false)
  with check (false);

create policy "overbookings_deny_authenticated"
  on public.overbookings
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.overbookings is
  'Decisões da recepção sobre encaixes sugeridos pelo score de falta. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.overbookings to service_role;
