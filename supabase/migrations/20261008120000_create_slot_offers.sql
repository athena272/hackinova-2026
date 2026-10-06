-- AgendaCerta: oferta em cascata da vaga liberada para a lista de espera.
-- A vaga vai primeiro a quem mora mais perto e espera há mais tempo; sem resposta
-- no prazo, ou com recusa, a oferta passa ao próximo candidato.

-- Quando o paciente entrou na lista de espera. created_at não serve: nas linhas
-- do seed ele é o momento da migration, igual para todo mundo.
alter table public.waitlist
  add column requested_at timestamptz not null default now();

comment on column public.waitlist.requested_at is
  'Quando o paciente entrou na lista de espera; desempata a ordem da oferta em cascata.';

create type public.slot_offer_status as enum (
  'pendente',
  'aceita',
  'recusada',
  'expirada'
);

grant usage on type public.slot_offer_status to service_role;

create table public.slot_offers (
  id text primary key,
  appointment_id text not null references public.appointments (id),
  waitlist_id text not null references public.waitlist (id),
  status public.slot_offer_status not null default 'pendente',
  offered_at timestamptz not null,
  expires_at timestamptz not null,
  closed_at timestamptz,
  timeout_minutes smallint not null,
  distance_km numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_offers_expires_after_offer check (expires_at > offered_at),
  constraint slot_offers_closed_iff_answered check ((status = 'pendente') = (closed_at is null)),
  constraint slot_offers_closed_after_offer check (closed_at is null or closed_at >= offered_at),
  constraint slot_offers_timeout_option check (timeout_minutes in (2, 5, 15, 30)),
  constraint slot_offers_distance_not_negative check (distance_km is null or distance_km >= 0)
);

-- Uma oferta aberta por vaga e uma por candidato: a regra vale mesmo com
-- duas requisições ao mesmo tempo.
create unique index slot_offers_one_pending_per_appointment
  on public.slot_offers (appointment_id)
  where status = 'pendente';

create unique index slot_offers_one_pending_per_candidate
  on public.slot_offers (waitlist_id)
  where status = 'pendente';

create index slot_offers_appointment_offered_at_idx
  on public.slot_offers (appointment_id, offered_at);

create or replace function public.set_slot_offers_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger slot_offers_set_updated_at
before update on public.slot_offers
for each row
execute function public.set_slot_offers_updated_at();

alter table public.slot_offers enable row level security;

create policy "slot_offers_deny_anon"
  on public.slot_offers
  for all
  to anon
  using (false)
  with check (false);

create policy "slot_offers_deny_authenticated"
  on public.slot_offers
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.slot_offers is
  'Ofertas de vaga liberada para a lista de espera, em cascata. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.slot_offers to service_role;
