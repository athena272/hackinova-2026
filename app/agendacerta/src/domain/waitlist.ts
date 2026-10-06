export type WaitlistStatus = "aguardando" | "atribuido";

export type WaitlistEntry = {
  id: string;
  patientId: string;
  patientName: string;
  specialty: string;
  phoneMasked: string;
  status: WaitlistStatus;
};

const WAITLIST_STATUSES: Record<WaitlistStatus, true> = {
  aguardando: true,
  atribuido: true,
};

export function isWaitlistStatus(value: unknown): value is WaitlistStatus {
  return typeof value === "string" && Object.hasOwn(WAITLIST_STATUSES, value);
}
