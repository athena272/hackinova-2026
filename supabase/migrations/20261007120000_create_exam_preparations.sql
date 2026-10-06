-- AgendaCerta: preparo exigido por tipo de exame e resposta do paciente ao checklist.
-- O preparo vale para o exame, não para o agendamento: o vínculo é pelo nome
-- (appointments.procedure_name = exam_preparations.exam_name), já que não existe tabela de exames.

create table public.exam_preparations (
  id text primary key,
  exam_name text not null,
  instructions text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_preparations_exam_name_key unique (exam_name),
  constraint exam_preparations_exam_name_not_blank check (btrim(exam_name) <> ''),
  constraint exam_preparations_instructions_not_blank check (btrim(instructions) <> '')
);

create table public.exam_preparation_items (
  id text primary key,
  preparation_id text not null references public.exam_preparations (id) on delete cascade,
  position smallint not null,
  label text not null,
  question text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_preparation_items_position_key unique (preparation_id, position),
  constraint exam_preparation_items_position_positive check (position > 0),
  constraint exam_preparation_items_label_not_blank check (btrim(label) <> ''),
  constraint exam_preparation_items_question_not_blank check (btrim(question) <> '')
);

create or replace function public.set_exam_preparations_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger exam_preparations_set_updated_at
before update on public.exam_preparations
for each row
execute function public.set_exam_preparations_updated_at();

create or replace function public.set_exam_preparation_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger exam_preparation_items_set_updated_at
before update on public.exam_preparation_items
for each row
execute function public.set_exam_preparation_items_updated_at();

alter table public.exam_preparations enable row level security;

create policy "exam_preparations_deny_anon"
  on public.exam_preparations
  for all
  to anon
  using (false)
  with check (false);

create policy "exam_preparations_deny_authenticated"
  on public.exam_preparations
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.exam_preparation_items enable row level security;

create policy "exam_preparation_items_deny_anon"
  on public.exam_preparation_items
  for all
  to anon
  using (false)
  with check (false);

create policy "exam_preparation_items_deny_authenticated"
  on public.exam_preparation_items
  for all
  to authenticated
  using (false)
  with check (false);

comment on table public.exam_preparations is
  'Preparo exigido por tipo de exame (instruções). RLS deny para anon/authenticated; use service_role no servidor.';

comment on table public.exam_preparation_items is
  'Itens do checklist de preparo, respondidos com sim ou não. RLS deny para anon/authenticated; use service_role no servidor.';

grant select, insert, update, delete on table public.exam_preparations to service_role;
grant select, insert, update, delete on table public.exam_preparation_items to service_role;

-- Resposta do paciente ao checklist. Sem resposta, as três colunas ficam vazias.
create type public.preparation_result as enum (
  'ok',
  'nao_cumprido'
);

grant usage on type public.preparation_result to service_role;

alter table public.appointments
  add column preparation_result public.preparation_result,
  add column preparation_answered_at timestamptz,
  add column preparation_missed_item_ids text[] not null default '{}',
  add constraint appointments_preparation_answer_complete
    check ((preparation_result is null) = (preparation_answered_at is null)),
  add constraint appointments_preparation_missed_items_match_result
    check (
      (preparation_result is not distinct from 'nao_cumprido')
      = (cardinality(preparation_missed_item_ids) > 0)
    );
