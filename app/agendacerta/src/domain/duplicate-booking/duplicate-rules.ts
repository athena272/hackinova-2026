import type { Appointment } from "../appointment";

/**
 * Regras ajustáveis do booking duplo, num único lugar (como os pesos do score).
 * Os testes leem os limites daqui.
 */

/** Horários do mesmo paciente e serviço a até esta distância contam como possível duplicidade. */
export const DUPLICATE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export const DUPLICATE_WINDOW_MS = DUPLICATE_WINDOW_DAYS * DAY_MS;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}

/**
 * O que o paciente marcou: consulta vale pela especialidade e exame pelo nome,
 * porque dois exames diferentes da mesma especialidade não são o mesmo serviço.
 */
export function serviceKeyOf(appointment: Pick<Appointment, "specialty" | "procedure">): string {
  return appointment.procedure.type === "exame"
    ? `exame:${normalize(appointment.procedure.examName)}`
    : `consulta:${normalize(appointment.specialty)}`;
}

/** Mesma chave para o mesmo conjunto de horários, em qualquer ordem. */
export function groupKeyOf(appointmentIds: readonly string[]): string {
  return [...appointmentIds].sort().join(",");
}
