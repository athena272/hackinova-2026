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

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  specialty: string;
  scheduledAt: string;
  status: AppointmentStatus;
  phoneMasked: string;
  procedure: Procedure;
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
