-- AgendaCerta: quando o agendamento foi marcado (fator "antecedência" do score de falta).
-- created_at não serve: nas linhas do seed ele é o momento da migration, depois da consulta.

alter table public.appointments add column booked_at timestamptz;

-- Antecedência em dias do seed de demonstração.
-- Mantenha em sincronia com app/agendacerta/data/appointments.seed.json (seed.test.ts confere).
update public.appointments as appointment
set booked_at = appointment.scheduled_at - make_interval(days => seed.lead_days)
from (values
  ('apt-001', 40),
  ('apt-002', 3),
  ('apt-003', 20),
  ('apt-004', 7),
  ('apt-005', 35),
  ('apt-006', 15),
  ('apt-007', 2),
  ('apt-008', 30),
  ('hist-001', 30),
  ('hist-002', 45),
  ('hist-003', 10),
  ('hist-004', 5),
  ('hist-005', 7),
  ('hist-006', 4),
  ('hist-007', 14),
  ('hist-008', 35),
  ('hist-009', 6),
  ('hist-010', 8),
  ('hist-011', 40),
  ('hist-012', 32),
  ('hist-013', 12),
  ('hist-014', 9),
  ('hist-015', 28),
  ('hist-016', 5),
  ('hist-017', 6),
  ('hist-018', 10),
  ('hist-019', 21),
  ('hist-020', 15),
  ('hist-021', 33),
  ('hist-022', 12),
  ('hist-023', 2),
  ('hist-024', 30),
  ('hist-025', 38),
  ('hist-026', 25),
  ('hist-027', 9),
  ('hist-028', 31),
  ('hist-029', 7),
  ('hist-030', 5)
) as seed (id, lead_days)
where appointment.id = seed.id;

-- Demais linhas (dados já existentes na nuvem): melhor estimativa sem passar do horário.
update public.appointments
set booked_at = least(created_at, scheduled_at)
where booked_at is null;

alter table public.appointments
  alter column booked_at set not null,
  alter column booked_at set default now(),
  add constraint appointments_booked_at_before_scheduled
    check (booked_at <= scheduled_at);
