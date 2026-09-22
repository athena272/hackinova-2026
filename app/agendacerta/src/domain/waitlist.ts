export type WaitlistStatus = "aguardando" | "atribuido";

export type WaitlistEntry = {
  id: string;
  patientName: string;
  specialty: string;
  phoneMasked: string;
  status: WaitlistStatus;
};
