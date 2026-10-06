export type AppointmentStatus =
  | "pendente"
  | "confirmado"
  | "liberado"
  | "remarcacao_solicitada"
  | "compareceu"
  | "faltou";

export type ConfirmationAction = "SIM" | "NAO" | "REMARCAR";

export type ProcedureType = "consulta" | "exame";

/** Consulta é descrita pela especialidade; exame sempre tem nome. */
export type Procedure =
  | { type: "consulta" }
  | { type: "exame"; examName: string };

export type PreparationResult = "ok" | "nao_cumprido";

/** Resposta do paciente ao checklist de preparo do exame. */
export type PreparationAnswer = {
  result: PreparationResult;
  /** Itens que o paciente disse que não vai cumprir; vazio quando o resultado é ok. */
  missedItemIds: string[];
  answeredAt: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  specialty: string;
  scheduledAt: string;
  /** Quando a consulta foi marcada (base do fator antecedência). */
  bookedAt: string;
  status: AppointmentStatus;
  phoneMasked: string;
  procedure: Procedure;
  /** null enquanto o paciente não respondeu (ou quando não há checklist). */
  preparation: PreparationAnswer | null;
};

// Record força listar todos os valores do tipo em tempo de compilação.
const APPOINTMENT_STATUSES: Record<AppointmentStatus, true> = {
  pendente: true,
  confirmado: true,
  liberado: true,
  remarcacao_solicitada: true,
  compareceu: true,
  faltou: true,
};

const PROCEDURE_TYPES: Record<ProcedureType, true> = {
  consulta: true,
  exame: true,
};

const PREPARATION_RESULTS: Record<PreparationResult, true> = {
  ok: true,
  nao_cumprido: true,
};

export function isPreparationResult(value: unknown): value is PreparationResult {
  return typeof value === "string" && Object.hasOwn(PREPARATION_RESULTS, value);
}

export function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return typeof value === "string" && Object.hasOwn(APPOINTMENT_STATUSES, value);
}

export function isProcedureType(value: unknown): value is ProcedureType {
  return typeof value === "string" && Object.hasOwn(PROCEDURE_TYPES, value);
}

export const CONFIRMATION_ACTIONS: readonly ConfirmationAction[] = [
  "SIM",
  "NAO",
  "REMARCAR",
] as const;

export function isConfirmationAction(
  value: unknown,
): value is ConfirmationAction {
  return (
    typeof value === "string" &&
    (CONFIRMATION_ACTIONS as readonly string[]).includes(value)
  );
}

/** Vagas que a clínica pode tentar reaproveitar. */
export function isSlotReusable(status: AppointmentStatus): boolean {
  return status === "liberado" || status === "remarcacao_solicitada";
}

/** Agendamento que ainda vai acontecer com o paciente marcado. */
export function isActiveBooking(status: AppointmentStatus): boolean {
  return status === "pendente" || status === "confirmado";
}

/** Consulta já aconteceu (ou não): compõe o histórico de comparecimento. */
export function isAttendanceOutcome(status: AppointmentStatus): boolean {
  return status === "compareceu" || status === "faltou";
}

export class InvalidProcedureError extends Error {
  readonly code = "EXAM_NAME_REQUIRED";

  constructor(message: string) {
    super(message);
    this.name = "InvalidProcedureError";
  }
}

/**
 * Monta o procedimento a partir das colunas do banco (ou do seed),
 * garantindo que exame sempre tenha nome.
 */
export function createProcedure(
  type: ProcedureType,
  name: string | null | undefined,
): Procedure {
  if (type === "consulta") {
    return { type: "consulta" };
  }

  const examName = name?.trim();
  if (!examName) {
    throw new InvalidProcedureError("Exame sem nome do procedimento.");
  }
  return { type: "exame", examName };
}
