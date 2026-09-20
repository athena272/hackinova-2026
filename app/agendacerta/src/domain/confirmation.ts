import type { AppointmentStatus, ConfirmationAction } from "./appointment";

export class ConfirmationError extends Error {
  readonly code: "INVALID_ACTION" | "NOT_PENDING";

  constructor(code: "INVALID_ACTION" | "NOT_PENDING", message: string) {
    super(message);
    this.name = "ConfirmationError";
    this.code = code;
  }
}

const ACTION_TO_STATUS: Record<ConfirmationAction, AppointmentStatus> = {
  SIM: "confirmado",
  NAO: "liberado",
  REMARCAR: "remarcacao_solicitada",
};

/**
 * Aplica a resposta do paciente ao status atual da vaga.
 * Função pura: não persiste nada.
 */
export function applyConfirmationAction(
  currentStatus: AppointmentStatus,
  action: ConfirmationAction,
): AppointmentStatus {
  if (!(action in ACTION_TO_STATUS)) {
    throw new ConfirmationError(
      "INVALID_ACTION",
      `Ação de confirmação inválida: ${String(action)}`,
    );
  }

  if (currentStatus !== "pendente") {
    throw new ConfirmationError(
      "NOT_PENDING",
      `Não é possível confirmar uma vaga com status "${currentStatus}".`,
    );
  }

  return ACTION_TO_STATUS[action];
}
