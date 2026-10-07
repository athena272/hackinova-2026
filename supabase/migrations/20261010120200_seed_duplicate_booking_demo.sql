-- AgendaCerta: demonstração da detecção de booking duplo.
-- Bruno Lima tem Endocrinologia marcada duas vezes, em unidades diferentes (booking duplo).
-- Diego Alves tem uma consulta de Cardiologia e o retorno dela (não é booking duplo).
-- Mantenha em sincronia com app/agendacerta/data/*.seed.json (seed.test.ts confere).

insert into public.clinic_units (id, name, neighborhood_id) values
  ('unit-jardins', 'Unidade Jardins', 'nb-jardins'),
  ('unit-centro', 'Unidade Centro', 'nb-centro');

-- booked_at entra igual ao horário só para respeitar a check constraint;
-- a antecedência de verdade é aplicada logo abaixo.
insert into public.appointments (
  id,
  patient_id,
  specialty,
  scheduled_at,
  booked_at,
  status,
  procedure_type,
  procedure_name
)
select
  seed.id,
  patient.id,
  seed.specialty,
  seed.scheduled_at::timestamptz,
  seed.scheduled_at::timestamptz,
  seed.status::public.appointment_status,
  seed.procedure_type::public.procedure_type,
  seed.procedure_name
from (values
  ('apt-009', 'Bruno Lima', '(79) 9****-5678', 'Endocrinologia', '2026-09-24T10:00:00-03:00', 'pendente', 'consulta', null),
  ('apt-010', 'Diego Alves', '(79) 9****-3344', 'Cardiologia', '2026-09-29T14:00:00-03:00', 'pendente', 'consulta', null),
  ('apt-011', 'Diego Alves', '(79) 9****-3344', 'Cardiologia', '2026-10-13T14:00:00-03:00', 'pendente', 'consulta', null)
) as seed (id, full_name, phone_masked, specialty, scheduled_at, status, procedure_type, procedure_name)
join public.patients as patient
  on patient.full_name = seed.full_name
 and patient.phone_masked = seed.phone_masked;

-- Antecedência em dias, no mesmo formato da migration de booked_at.
update public.appointments as appointment
set booked_at = appointment.scheduled_at - make_interval(days => seed.lead_days)
from (values
  ('apt-009', 4),
  ('apt-010', 10),
  ('apt-011', 24)
) as seed (id, lead_days)
where appointment.id = seed.id;

update public.appointments as appointment
set unit_id = seed.unit_id
from (values
  ('apt-002', 'unit-jardins'),
  ('apt-009', 'unit-centro'),
  ('apt-010', 'unit-jardins'),
  ('apt-011', 'unit-jardins')
) as seed (id, unit_id)
where appointment.id = seed.id;

update public.appointments
set return_of_appointment_id = 'apt-010'
where id = 'apt-011';
