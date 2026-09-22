/**
 * Enriquece mensagens da Data API com orientação acionável.
 * Regressão Vercel: "permission denied for table ..." (falta de GRANT / key errada).
 */
export function enrichDataApiErrorMessage(message: string): string {
  if (/permission denied for table\s+(appointments|waitlist)/i.test(message)) {
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

export function formatOfferAppointmentError(message: string): string {
  return `Falha ao oferecer vaga: ${enrichDataApiErrorMessage(message)}`;
}

export function formatListWaitlistError(message: string): string {
  return `Falha ao listar lista de espera: ${enrichDataApiErrorMessage(message)}`;
}

export function formatGetWaitlistError(message: string): string {
  return `Falha ao buscar candidato da lista de espera: ${enrichDataApiErrorMessage(message)}`;
}

export function formatAssignWaitlistError(message: string): string {
  return `Falha ao atualizar lista de espera: ${enrichDataApiErrorMessage(message)}`;
}
