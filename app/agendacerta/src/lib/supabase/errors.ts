/**
 * Enriquece mensagens da Data API com orientação acionável.
 * Regressão Vercel: "permission denied for table appointments" (falta de GRANT / key errada).
 */
export function enrichDataApiErrorMessage(message: string): string {
  if (/permission denied for table\s+appointments/i.test(message)) {
    return (
      `${message}. ` +
      "Confirme o GRANT ao service_role (migration) e que SUPABASE_SERVICE_ROLE_KEY é a secret, não a anon/publishable."
    );
  }
  return message;
}

export function formatListAppointmentsError(message: string): string {
  return `Falha ao listar agendamentos: ${enrichDataApiErrorMessage(message)}`;
}

export function formatGetAppointmentError(message: string): string {
  return `Falha ao buscar agendamento: ${enrichDataApiErrorMessage(message)}`;
}

export function formatConfirmAppointmentError(message: string): string {
  return `Falha ao confirmar agendamento: ${enrichDataApiErrorMessage(message)}`;
}
