-- Data API: privilege check roda antes do RLS.
-- Sem GRANT, service_role recebe "permission denied for table appointments" (42501).
grant usage on type public.appointment_status to service_role;
grant select, insert, update, delete on table public.appointments to service_role;
