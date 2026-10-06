-- AgendaCerta: dados de demonstração para o diferencial.
-- Perfis de comparecimento (faltoso, assíduo e misto), bairros perto e longe da clínica
-- e exames que exigem preparo. Mantenha em sincronia com app/agendacerta/data/*.seed.json
-- (o teste src/data/seed.test.ts confere os ids).
-- Pacientes são ligados por nome + telefone mascarado para não depender do id gerado no backfill.

update public.patients as patient
set neighborhood_id = seed.neighborhood_id
from (values
  ('Ana Souza', '(79) 9****-1234', 'nb-santa-maria'),
  ('Bruno Lima', '(79) 9****-5678', 'nb-grageru'),
  ('Carla Mendes', '(79) 9****-9012', 'nb-bugio'),
  ('Diego Alves', '(79) 9****-3344', 'nb-jardins'),
  ('Elena Rocha', '(79) 9****-7788', 'nb-socorro-centro'),
  ('Fábio Nunes', '(79) 9****-2211', 'nb-farolandia'),
  ('Helena Dias', '(79) 9****-4444', 'nb-treze-de-julho'),
  ('Igor Santos', '(79) 9****-5555', 'nb-centro'),
  ('Juliana Prado', '(79) 9****-6666', 'nb-atalaia'),
  ('Karen Oliveira', '(79) 9****-7777', 'nb-sao-cristovao-centro')
) as seed (full_name, phone_masked, neighborhood_id)
where patient.full_name = seed.full_name
  and patient.phone_masked = seed.phone_masked;

insert into public.patients (id, full_name, phone_masked, neighborhood_id) values
  ('pat-demo-01', 'Lucas Ferreira', '(79) 9****-8181', 'nb-luzia'),
  ('pat-demo-02', 'Marina Costa', '(79) 9****-8282', 'nb-coroa-do-meio'),
  ('pat-demo-03', 'Nelson Araújo', '(79) 9****-8383', 'nb-siqueira-campos'),
  ('pat-demo-04', 'Olívia Martins', '(79) 9****-8484', 'nb-inacio-barbosa');

update public.appointments
set procedure_type = 'exame',
    procedure_name = 'Ultrassonografia de abdome total'
where id = 'apt-004';

insert into public.appointments (
  id,
  patient_id,
  specialty,
  scheduled_at,
  status,
  procedure_type,
  procedure_name
)
select
  seed.id,
  patient.id,
  seed.specialty,
  seed.scheduled_at::timestamptz,
  seed.status::public.appointment_status,
  seed.procedure_type::public.procedure_type,
  seed.procedure_name
from (values
  -- Agenda futura: exames com preparo
  ('apt-007', 'Lucas Ferreira', '(79) 9****-8181', 'Laboratório', '2026-09-24T07:30:00-03:00', 'pendente', 'exame', 'Glicemia em jejum'),
  ('apt-008', 'Marina Costa', '(79) 9****-8282', 'Ultrassonografia', '2026-09-24T09:00:00-03:00', 'pendente', 'exame', 'Ultrassonografia de abdome total'),
  -- Histórico de comparecimento
  ('hist-001', 'Ana Souza', '(79) 9****-1234', 'Neurologia', '2026-06-10T09:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-002', 'Ana Souza', '(79) 9****-1234', 'Neurologia', '2026-07-15T09:30:00-03:00', 'faltou', 'consulta', null),
  ('hist-003', 'Ana Souza', '(79) 9****-1234', 'Neurologia', '2026-08-19T10:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-004', 'Bruno Lima', '(79) 9****-5678', 'Endocrinologia', '2026-06-03T10:30:00-03:00', 'compareceu', 'consulta', null),
  ('hist-005', 'Bruno Lima', '(79) 9****-5678', 'Endocrinologia', '2026-07-08T10:30:00-03:00', 'compareceu', 'consulta', null),
  ('hist-006', 'Bruno Lima', '(79) 9****-5678', 'Endocrinologia', '2026-08-12T11:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-007', 'Carla Mendes', '(79) 9****-9012', 'Oftalmologia', '2026-06-24T14:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-008', 'Carla Mendes', '(79) 9****-9012', 'Oftalmologia', '2026-08-05T14:30:00-03:00', 'faltou', 'consulta', null),
  ('hist-009', 'Diego Alves', '(79) 9****-3344', 'Ultrassonografia', '2026-06-17T08:15:00-03:00', 'compareceu', 'exame', 'Ultrassonografia de tireoide'),
  ('hist-010', 'Diego Alves', '(79) 9****-3344', 'Ultrassonografia', '2026-08-26T08:30:00-03:00', 'compareceu', 'exame', 'Ultrassonografia de tireoide'),
  ('hist-011', 'Elena Rocha', '(79) 9****-7788', 'Neurologia', '2026-06-12T11:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-012', 'Elena Rocha', '(79) 9****-7788', 'Neurologia', '2026-07-17T11:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-013', 'Elena Rocha', '(79) 9****-7788', 'Neurologia', '2026-09-04T11:30:00-03:00', 'compareceu', 'consulta', null),
  ('hist-014', 'Fábio Nunes', '(79) 9****-2211', 'Endocrinologia', '2026-07-01T15:45:00-03:00', 'compareceu', 'consulta', null),
  ('hist-015', 'Fábio Nunes', '(79) 9****-2211', 'Endocrinologia', '2026-08-28T16:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-016', 'Helena Dias', '(79) 9****-4444', 'Neurologia', '2026-06-22T09:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-017', 'Helena Dias', '(79) 9****-4444', 'Neurologia', '2026-08-24T09:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-018', 'Igor Santos', '(79) 9****-5555', 'Endocrinologia', '2026-07-06T10:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-019', 'Igor Santos', '(79) 9****-5555', 'Endocrinologia', '2026-09-02T10:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-020', 'Juliana Prado', '(79) 9****-6666', 'Oftalmologia', '2026-07-21T14:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-021', 'Karen Oliveira', '(79) 9****-7777', 'Neurologia', '2026-06-29T08:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-022', 'Karen Oliveira', '(79) 9****-7777', 'Neurologia', '2026-08-31T08:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-023', 'Lucas Ferreira', '(79) 9****-8181', 'Laboratório', '2026-07-09T07:00:00-03:00', 'compareceu', 'exame', 'Hemograma completo'),
  ('hist-024', 'Marina Costa', '(79) 9****-8282', 'Ultrassonografia', '2026-06-16T09:00:00-03:00', 'faltou', 'exame', 'Ultrassonografia de abdome total'),
  ('hist-025', 'Marina Costa', '(79) 9****-8282', 'Ultrassonografia', '2026-08-11T09:00:00-03:00', 'faltou', 'exame', 'Ultrassonografia de abdome total'),
  ('hist-026', 'Nelson Araújo', '(79) 9****-8383', 'Oftalmologia', '2026-06-08T15:00:00-03:00', 'faltou', 'consulta', null),
  ('hist-027', 'Nelson Araújo', '(79) 9****-8383', 'Oftalmologia', '2026-07-13T15:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-028', 'Nelson Araújo', '(79) 9****-8383', 'Oftalmologia', '2026-09-14T15:30:00-03:00', 'faltou', 'consulta', null),
  ('hist-029', 'Olívia Martins', '(79) 9****-8484', 'Neurologia', '2026-07-27T10:00:00-03:00', 'compareceu', 'consulta', null),
  ('hist-030', 'Olívia Martins', '(79) 9****-8484', 'Neurologia', '2026-09-09T10:30:00-03:00', 'compareceu', 'consulta', null)
) as seed (id, full_name, phone_masked, specialty, scheduled_at, status, procedure_type, procedure_name)
join public.patients as patient
  on patient.full_name = seed.full_name
 and patient.phone_masked = seed.phone_masked;
