-- AgendaCerta: unidades da rede e vínculo de retorno no agendamento.
-- A unidade mostra onde cada horário acontece (booking duplo em unidades diferentes).
-- O vínculo de retorno marca a consulta de retorno, que nunca conta como booking duplo.
-- As duas colunas são opcionais: agendamentos antigos continuam sem unidade e sem vínculo.

create table public.clinic_units (
  id text primary key,
  name text not null unique,
  neighborhood_id text references public.neighborhoods (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_clinic_units_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clinic_units_set_updated_at
before update on public.clinic_units
for each row
execute function public.set_clinic_units_updated_at();

alter table public.clinic_units enable row level security;

create policy "clinic_units_deny_anon"
  on public.clinic_units
  for all
  to anon
  using (false)
  with check (false);

create policy "clinic_units_deny_authenticated"
  on public.clinic_units
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.clinic_units is
  'Unidades da rede da clínica. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.clinic_units to service_role;

alter table public.appointments
  add column unit_id text references public.clinic_units (id),
  add column return_of_appointment_id text references public.appointments (id),
  add constraint appointments_return_not_self
    check (return_of_appointment_id is null or return_of_appointment_id <> id);

create index appointments_unit_id_idx on public.appointments (unit_id);

create index appointments_return_of_appointment_id_idx
  on public.appointments (return_of_appointment_id);

comment on column public.appointments.unit_id is
  'Unidade onde o atendimento acontece; null em agendamentos anteriores às unidades.';

comment on column public.appointments.return_of_appointment_id is
  'Consulta de origem quando este agendamento é um retorno; retorno nunca conta como booking duplo.';
