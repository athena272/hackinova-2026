-- AgendaCerta: motivo de a vaga estar livre, gravado em cada oferta da cascata.
-- A linha do agendamento é reaproveitada pelo novo paciente (e o preparo é
-- limpo no aceite), então a origem da vaga recuperada só fica rastreável aqui.
-- Ofertas antigas ficam como cancelamento comum.

create type public.slot_release_reason as enum (
  'cancelamento',
  'preparo',
  'booking_duplo'
);

grant usage on type public.slot_release_reason to service_role;

alter table public.slot_offers
  add column release_reason public.slot_release_reason not null default 'cancelamento';

comment on column public.slot_offers.release_reason is
  'Por que a vaga estava livre quando a oferta foi feita: cancelamento comum, preparo não cumprido ou booking duplo. Base dos indicadores de vagas recuperadas.';
