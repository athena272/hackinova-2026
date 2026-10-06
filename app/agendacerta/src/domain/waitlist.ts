export type WaitlistStatus = "aguardando" | "atribuido";

export type WaitlistEntry = {
  id: string;
  patientId: string;
  patientName: string;
  specialty: string;
  phoneMasked: string;
  status: WaitlistStatus;
  /** Quando entrou na lista de espera (ISO); quem espera há mais tempo tem prioridade. */
  requestedAt: string;
};

const WAITLIST_STATUSES: Record<WaitlistStatus, true> = {
  aguardando: true,
  atribuido: true,
};

export function isWaitlistStatus(value: unknown): value is WaitlistStatus {
  return typeof value === "string" && Object.hasOwn(WAITLIST_STATUSES, value);
}
