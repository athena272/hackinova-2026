import type { WaitlistEntry } from "../waitlist";
import type { SlotOfferResponse, SlotOfferTimeout } from "./offer-rules";

export type { SlotOfferResponse };

export type SlotOfferStatus = "pendente" | "aceita" | "recusada" | "expirada";

export type SlotOfferCandidate = {
  waitlistId: string;
  patientId: string;
  patientName: string;
};

export type SlotOffer = {
  id: string;
  appointmentId: string;
  candidate: SlotOfferCandidate;
  status: SlotOfferStatus;
  offeredAt: string;
  expiresAt: string;
  /** Quando a oferta saiu de pendente: resposta do candidato ou fim do prazo. */
  closedAt: string | null;
  timeoutMinutes: SlotOfferTimeout;
  /** Distância até a clínica no momento da oferta; explica a ordem no histórico. */
  distanceKm: number | null;
};

export type DistanceBand = "perto" | "medio" | "longe" | "desconhecida";

export type RankableCandidate = WaitlistEntry & {
  distanceKm: number | null;
};

export type RankedCandidate = RankableCandidate & {
  band: DistanceBand;
};
