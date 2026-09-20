export type AppointmentStatus =
  | "pendente"
  | "confirmado"
  | "liberado"
  | "remarcacao_solicitada";

export type ConfirmationAction = "SIM" | "NAO" | "REMARCAR";

export type Appointment = {
  id: string;
  patientName: string;
  specialty: string;
  scheduledAt: string;
  status: AppointmentStatus;
  phoneMasked: string;
};

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
