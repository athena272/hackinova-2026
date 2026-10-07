-- AgendaCerta: confirmação reforçada de booking duplo.
-- Quando o mesmo paciente tem mais de um horário para a mesma consulta ou exame em
-- datas próximas, a clínica pergunta pelo WhatsApp qual horário ele quer manter.
-- Cada linha é uma pergunta enviada; os horários perguntados ficam na tabela de itens.

create type public.duplicate_check_status as enum (
  'aguardando',
  'resolvida'
);

grant usage on type public.duplicate_check_status to service_role;

create table public.duplicate_booking_checks (
  id text primary key,
  patient_id text not null references public.patients (id),
  group_key text not null,
  status public.duplicate_check_status not null default 'aguardando',
  kept_appointment_id text references public.appointments (id),
  sent_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint duplicate_booking_checks_kept_iff_resolved
    check ((status = 'resolvida') = (kept_appointment_id is not null)),
  constraint duplicate_booking_checks_resolved_at_iff_resolved
    check ((status = 'resolvida') = (resolved_at is not null)),
  constraint duplicate_booking_checks_resolved_after_sent
    check (resolved_at is null or resolved_at >= sent_at)
);

-- Dois envios ao mesmo tempo para o mesmo grupo de horários: o segundo esbarra aqui.
create unique index duplicate_booking_checks_one_open_per_group
  on public.duplicate_booking_checks (group_key)
  where status = 'aguardando';

create index duplicate_booking_checks_patient_idx
  on public.duplicate_booking_checks (patient_id);

create table public.duplicate_booking_check_appointments (
  check_id text not null references public.duplicate_booking_checks (id) on delete cascade,
  appointment_id text not null references public.appointments (id),
  created_at timestamptz not null default now(),
  primary key (check_id, appointment_id)
);

create index duplicate_booking_check_appointments_appointment_idx
  on public.duplicate_booking_check_appointments (appointment_id);

create or replace function public.set_duplicate_booking_checks_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger duplicate_booking_checks_set_updated_at
before update on public.duplicate_booking_checks
for each row
execute function public.set_duplicate_booking_checks_updated_at();

alter table public.duplicate_booking_checks enable row level security;
alter table public.duplicate_booking_check_appointments enable row level security;

create policy "duplicate_booking_checks_deny_anon"
  on public.duplicate_booking_checks
  for all
  to anon
  using (false)
  with check (false);

create policy "duplicate_booking_checks_deny_authenticated"
  on public.duplicate_booking_checks
  for all
  to authenticated
  using (false)
  with check (false);

create policy "duplicate_booking_check_appointments_deny_anon"
  on public.duplicate_booking_check_appointments
  for all
  to anon
  using (false)
  with check (false);

create policy "duplicate_booking_check_appointments_deny_authenticated"
  on public.duplicate_booking_check_appointments
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.duplicate_booking_checks is
  'Confirmações reforçadas de booking duplo enviadas ao paciente. RLS deny para anon/authenticated; use service_role no servidor.';

comment on table public.duplicate_booking_check_appointments is
  'Horários incluídos em cada confirmação reforçada. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.duplicate_booking_checks to service_role;
grant select, insert, update, delete on table public.duplicate_booking_check_appointments to service_role;
