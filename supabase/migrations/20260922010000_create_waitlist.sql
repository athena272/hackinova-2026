-- AgendaCerta: lista de espera para reaproveitar vagas liberadas (MVP)
create type public.waitlist_status as enum (
  'aguardando',
  'atribuido'
);

create table public.waitlist (
  id text primary key,
  patient_name text not null,
  specialty text not null,
  phone_masked text not null,
  status public.waitlist_status not null default 'aguardando',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index waitlist_specialty_status_idx
  on public.waitlist (specialty, status);

create or replace function public.set_waitlist_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger waitlist_set_updated_at
before update on public.waitlist
for each row
execute function public.set_waitlist_updated_at();

alter table public.waitlist enable row level security;

create policy "waitlist_deny_anon"
  on public.waitlist
  for all
  to anon
  using (false)
  with check (false);

create policy "waitlist_deny_authenticated"
  on public.waitlist
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.waitlist is
  'Lista de espera AgendaCerta. RLS deny para anon/authenticated; use service_role no servidor.';

grant usage on type public.waitlist_status to service_role;
grant select, insert, update, delete on table public.waitlist to service_role;

insert into public.waitlist (
  id,
  patient_name,
  specialty,
  phone_masked,
  status
) values
  (
    'wl-001',
    'Helena Dias',
    'Neurologia',
    '(79) 9****-4444',
    'aguardando'
  ),
  (
    'wl-002',
    'Igor Santos',
    'Endocrinologia',
    '(79) 9****-5555',
    'aguardando'
  ),
  (
    'wl-003',
    'Juliana Prado',
    'Oftalmologia',
    '(79) 9****-6666',
    'aguardando'
  ),
  (
    'wl-004',
    'Karen Oliveira',
    'Neurologia',
    '(79) 9****-7777',
    'aguardando'
  );
