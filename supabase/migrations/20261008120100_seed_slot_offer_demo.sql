-- AgendaCerta: datas de entrada na lista de espera e candidatos de Endocrinologia
-- para demonstrar a ordem da oferta em cascata na vaga liberada apt-006.
-- Mantenha em sincronia com app/agendacerta/data/waitlist.seed.json (seed.test.ts confere).

insert into public.waitlist (id, patient_id, specialty, status) values
  ('wl-007', 'pat-demo-01', 'Endocrinologia', 'aguardando'),
  ('wl-008', 'pat-dca67cc350e3', 'Endocrinologia', 'aguardando');

update public.waitlist as w
set requested_at = v.requested_at::timestamptz
from (values
  ('wl-001', '2026-08-20T10:00:00-03:00'),
  ('wl-002', '2026-08-10T10:00:00-03:00'),
  ('wl-003', '2026-08-25T10:00:00-03:00'),
  ('wl-004', '2026-09-01T10:00:00-03:00'),
  ('wl-005', '2026-09-15T10:00:00-03:00'),
  ('wl-006', '2026-09-18T10:00:00-03:00'),
  ('wl-007', '2026-09-20T10:00:00-03:00'),
  ('wl-008', '2026-07-15T10:00:00-03:00')
) as v (id, requested_at)
where w.id = v.id;
