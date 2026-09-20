-- Hardening pós-MVP: search_path fixo + policies explícitas (Security Advisor).
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

drop policy if exists "appointments_deny_anon" on public.appointments;
drop policy if exists "appointments_deny_authenticated" on public.appointments;

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
