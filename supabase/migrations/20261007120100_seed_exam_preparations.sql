-- AgendaCerta: preparos de demonstração, resposta já recebida de um exame e
-- candidatos da lista de espera para as vagas de exame liberadas por preparo.
-- Mantenha em sincronia com app/agendacerta/data/*.seed.json (seed.test.ts confere).

insert into public.exam_preparations (id, exam_name, instructions) values
  ('prep-us-abdome-total', 'Ultrassonografia de abdome total', 'Jejum de 8 horas. Uma hora antes, beba de 4 a 6 copos de água e não urine até o exame.'),
  ('prep-glicemia-jejum', 'Glicemia em jejum', 'Jejum de 8 a 12 horas (água está liberada). Evite bebida alcoólica nos 3 dias anteriores.');

insert into public.exam_preparation_items (id, preparation_id, position, label, question) values
  ('prep-us-abdome-total-jejum', 'prep-us-abdome-total', 1, 'Jejum de 8 horas', 'Você vai conseguir ficar 8 horas sem comer antes do exame?'),
  ('prep-us-abdome-total-bexiga', 'prep-us-abdome-total', 2, 'Bexiga cheia', 'Você vai beber a água indicada e chegar sem urinar?'),
  ('prep-glicemia-jejum-jejum', 'prep-glicemia-jejum', 1, 'Jejum de 8 a 12 horas', 'Você vai ficar de 8 a 12 horas sem comer, só com água?'),
  ('prep-glicemia-jejum-alcool', 'prep-glicemia-jejum', 2, 'Sem álcool por 3 dias', 'Você ficou sem bebida alcoólica nos últimos 3 dias?');

update public.appointments
set preparation_result = 'ok',
    preparation_answered_at = '2026-09-22T18:00:00-03:00'
where id = 'apt-004';

insert into public.waitlist (id, patient_id, specialty, status) values
  ('wl-005', 'pat-demo-03', 'Ultrassonografia', 'aguardando'),
  ('wl-006', 'pat-demo-04', 'Laboratório', 'aguardando');
