-- AgendaCerta: cadastro de paciente, bairros e tipo de procedimento.
-- Base para score de falta, checklist de preparo, oferta por proximidade e booking duplo.
-- Bairro em vez de endereço completo para reduzir exposição de dados pessoais (LGPD).

create type public.procedure_type as enum (
  'consulta',
  'exame'
);

-- Bairros com coordenadas aproximadas (centro do bairro), usadas só para distância estimada.
create table public.neighborhoods (
  id text primary key,
  name text not null,
  city text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint neighborhoods_name_city_key unique (name, city)
);

create or replace function public.set_neighborhoods_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger neighborhoods_set_updated_at
before update on public.neighborhoods
for each row
execute function public.set_neighborhoods_updated_at();

alter table public.neighborhoods enable row level security;

create policy "neighborhoods_deny_anon"
  on public.neighborhoods
  for all
  to anon
  using (false)
  with check (false);

create policy "neighborhoods_deny_authenticated"
  on public.neighborhoods
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.neighborhoods is
  'Bairros com coordenadas aproximadas para distância estimada. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.neighborhoods to service_role;

create table public.patients (
  id text primary key,
  full_name text not null,
  phone_masked text not null,
  neighborhood_id text references public.neighborhoods (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index patients_neighborhood_id_idx on public.patients (neighborhood_id);

create or replace function public.set_patients_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger patients_set_updated_at
before update on public.patients
for each row
execute function public.set_patients_updated_at();

alter table public.patients enable row level security;

create policy "patients_deny_anon"
  on public.patients
  for all
  to anon
  using (false)
  with check (false);

create policy "patients_deny_authenticated"
  on public.patients
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.patients is
  'Pacientes AgendaCerta (nome, telefone mascarado e bairro). RLS deny para anon/authenticated; use service_role no servidor.';

grant usage on type public.procedure_type to service_role;
grant select, insert, update, delete on table public.patients to service_role;

insert into public.neighborhoods (id, name, city, latitude, longitude) values
  ('nb-centro', 'Centro', 'Aracaju', -10.911100, -37.051700),
  ('nb-jardins', 'Jardins', 'Aracaju', -10.944000, -37.056000),
  ('nb-grageru', 'Grageru', 'Aracaju', -10.935000, -37.061000),
  ('nb-treze-de-julho', 'Treze de Julho', 'Aracaju', -10.929000, -37.048000),
  ('nb-salgado-filho', 'Salgado Filho', 'Aracaju', -10.925000, -37.060000),
  ('nb-suissa', 'Suíssa', 'Aracaju', -10.923000, -37.068000),
  ('nb-siqueira-campos', 'Siqueira Campos', 'Aracaju', -10.918000, -37.072000),
  ('nb-ponto-novo', 'Ponto Novo', 'Aracaju', -10.933000, -37.075000),
  ('nb-luzia', 'Luzia', 'Aracaju', -10.944000, -37.070000),
  ('nb-inacio-barbosa', 'Inácio Barbosa', 'Aracaju', -10.954000, -37.062000),
  ('nb-farolandia', 'Farolândia', 'Aracaju', -10.970000, -37.058000),
  ('nb-coroa-do-meio', 'Coroa do Meio', 'Aracaju', -10.960000, -37.043000),
  ('nb-atalaia', 'Atalaia', 'Aracaju', -10.989000, -37.049000),
  ('nb-santa-maria', 'Santa Maria', 'Aracaju', -11.008000, -37.100000),
  ('nb-bugio', 'Bugio', 'Aracaju', -10.888000, -37.090000),
  ('nb-industrial', 'Industrial', 'Aracaju', -10.890000, -37.056000),
  ('nb-socorro-centro', 'Centro', 'Nossa Senhora do Socorro', -10.855000, -37.126000),
  ('nb-sao-cristovao-centro', 'Centro', 'São Cristóvão', -11.015000, -37.206000);

-- Backfill: um paciente por par distinto de nome e telefone já gravado.
-- O id é determinístico para o seed em memória (data/patients.seed.json) usar os mesmos valores.
insert into public.patients (id, full_name, phone_masked)
select
  'pat-' || substr(md5(source.patient_name || '|' || source.phone_masked), 1, 12),
  source.patient_name,
  source.phone_masked
from (
  select patient_name, phone_masked from public.appointments
  union
  select patient_name, phone_masked from public.waitlist
) as source;

alter table public.appointments add column patient_id text;

update public.appointments as appointment
set patient_id = patient.id
from public.patients as patient
where patient.full_name = appointment.patient_name
  and patient.phone_masked = appointment.phone_masked;

alter table public.appointments
  alter column patient_id set not null,
  add constraint appointments_patient_id_fkey
    foreign key (patient_id) references public.patients (id) on delete restrict;

create index appointments_patient_id_idx on public.appointments (patient_id);

alter table public.waitlist add column patient_id text;

update public.waitlist as entry
set patient_id = patient.id
from public.patients as patient
where patient.full_name = entry.patient_name
  and patient.phone_masked = entry.phone_masked;

alter table public.waitlist
  alter column patient_id set not null,
  add constraint waitlist_patient_id_fkey
    foreign key (patient_id) references public.patients (id) on delete restrict;

create index waitlist_patient_id_idx on public.waitlist (patient_id);

-- Só depois do backfill: nome e telefone passam a viver apenas em patients.
alter table public.appointments
  drop column patient_name,
  drop column phone_masked;

alter table public.waitlist
  drop column patient_name,
  drop column phone_masked;

-- Exame sempre tem nome; consulta é descrita só pela especialidade.
alter table public.appointments
  add column procedure_type public.procedure_type not null default 'consulta',
  add column procedure_name text,
  add constraint appointments_procedure_name_check
    check ((procedure_type = 'exame') = (procedure_name is not null)),
  add constraint appointments_procedure_name_not_blank
    check (procedure_name is null or btrim(procedure_name) <> '');
