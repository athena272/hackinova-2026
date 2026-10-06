-- AgendaCerta: desfecho da consulta para formar o histórico de comparecimento.
-- compareceu = paciente atendido; faltou = não apareceu e não avisou.
-- "liberado" continua significando que o paciente avisou que não vai.
-- Fica numa migration própria: o Postgres não deixa usar um valor novo de enum
-- na mesma transação em que ele foi criado (o seed do histórico vem depois).
alter type public.appointment_status add value if not exists 'compareceu';
alter type public.appointment_status add value if not exists 'faltou';
