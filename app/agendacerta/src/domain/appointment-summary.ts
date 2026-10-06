import type { Appointment, AppointmentStatus } from "./appointment";
import { isAttendanceOutcome } from "./appointment";

export type AgendaAndHistory = {
  /** Agenda ativa, da mais próxima para a mais distante. */
  agenda: Appointment[];
  /** Histórico de comparecimento, do mais recente para o mais antigo. */
  history: Appointment[];
};

export function splitAgendaAndHistory(
  appointments: readonly Appointment[],
): AgendaAndHistory {
  // Compara instantes, não texto: o seed usa offset -03:00 e o banco devolve UTC.
  const byDateAsc = [...appointments].sort(
    (a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt),
  );

  return {
    agenda: byDateAsc.filter((item) => !isAttendanceOutcome(item.status)),
    history: byDateAsc.filter((item) => isAttendanceOutcome(item.status)).reverse(),
  };
}

export function countByStatus(
  appointments: readonly Appointment[],
): Record<AppointmentStatus, number> {
  const counts: Record<AppointmentStatus, number> = {
    pendente: 0,
    confirmado: 0,
    liberado: 0,
    remarcacao_solicitada: 0,
    compareceu: 0,
    faltou: 0,
  };
  for (const item of appointments) {
    counts[item.status] += 1;
  }
  return counts;
}
