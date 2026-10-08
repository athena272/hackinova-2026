import { isSlotReusable, type Appointment } from "../appointment";
import { SlotOfferError } from "./errors";
import { isSlotOfferTimeout, type SlotOfferTimeout } from "./offer-rules";
import { rankCandidates } from "./ranking";
import type { SlotReleaseReason } from "./release-reason";
import type {
  RankableCandidate,
  RankedCandidate,
  SlotOffer,
  SlotOfferResponse,
} from "./types";

const MINUTE_MS = 60_000;

export function assertSlotOfferTimeout(value: unknown): asserts value is SlotOfferTimeout {
  if (!isSlotOfferTimeout(value)) {
    throw new SlotOfferError(
      "INVALID_TIMEOUT",
      `Prazo de resposta inválido: ${String(value)}. Use 2, 5, 15 ou 30 minutos.`,
    );
  }
}

/** A vaga precisa estar liberada e sem oferta em aberto para começar uma cascata. */
export function assertCanStartCascade(
  appointment: Pick<Appointment, "id" | "status">,
  offersOfAppointment: readonly SlotOffer[],
): void {
  if (!isSlotReusable(appointment.status)) {
    throw new SlotOfferError(
      "SLOT_NOT_REUSABLE",
      `Não é possível oferecer uma vaga com status "${appointment.status}".`,
    );
  }
  if (offersOfAppointment.some((offer) => offer.status === "pendente")) {
    throw new SlotOfferError(
      "CASCADE_ALREADY_ACTIVE",
      `A vaga "${appointment.id}" já tem uma oferta aguardando resposta.`,
    );
  }
}

export type CreateOfferInput = {
  id: string;
  appointmentId: string;
  candidate: RankedCandidate;
  offeredAt: string;
  timeoutMinutes: SlotOfferTimeout;
  releaseReason: SlotReleaseReason;
};

export function createOffer({
  id,
  appointmentId,
  candidate,
  offeredAt,
  timeoutMinutes,
  releaseReason,
}: CreateOfferInput): SlotOffer {
  assertSlotOfferTimeout(timeoutMinutes);
  return {
    id,
    appointmentId,
    candidate: {
      waitlistId: candidate.id,
      patientId: candidate.patientId,
      patientName: candidate.patientName,
    },
    status: "pendente",
    offeredAt,
    expiresAt: new Date(Date.parse(offeredAt) + timeoutMinutes * MINUTE_MS).toISOString(),
    closedAt: null,
    timeoutMinutes,
    distanceKm: candidate.distanceKm === null ? null : roundToCents(candidate.distanceKm),
    releaseReason,
  };
}

/** Mesma precisão do numeric(6,2) do banco, para memória e Postgres devolverem o mesmo valor. */
function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export type NextOfferInput = {
  id: string;
  appointment: Pick<Appointment, "id" | "specialty">;
  candidates: readonly RankableCandidate[];
  /** Todas as ofertas já feitas para esta vaga. */
  offersOfAppointment: readonly SlotOffer[];
  /** Ofertas em aberto de todas as vagas. */
  pendingOffers: readonly SlotOffer[];
  offeredAt: string;
  timeoutMinutes: SlotOfferTimeout;
  releaseReason: SlotReleaseReason;
};

/** Oferta para o próximo da fila, ou null quando a fila acabou. Função pura. */
export function pickNextOffer(input: NextOfferInput): SlotOffer | null {
  const [next] = rankCandidates(input.candidates, {
    specialty: input.appointment.specialty,
    alreadyOfferedWaitlistIds: new Set(
      input.offersOfAppointment.map((offer) => offer.candidate.waitlistId),
    ),
    busyPatientIds: new Set(input.pendingOffers.map((offer) => offer.candidate.patientId)),
  });
  if (!next) return null;

  return createOffer({
    id: input.id,
    appointmentId: input.appointment.id,
    candidate: next,
    offeredAt: input.offeredAt,
    timeoutMinutes: input.timeoutMinutes,
    releaseReason: input.releaseReason,
  });
}

export function isOfferExpired(offer: SlotOffer, now: string): boolean {
  return offer.status === "pendente" && Date.parse(now) >= Date.parse(offer.expiresAt);
}

function assertPending(offer: SlotOffer): void {
  if (offer.status !== "pendente") {
    throw new SlotOfferError(
      "OFFER_NOT_PENDING",
      `A oferta "${offer.id}" já foi encerrada (status "${offer.status}").`,
    );
  }
}

/** Fecha a oferta no fim do prazo, mesmo que a expiração só seja aplicada depois. */
export function expireOffer(offer: SlotOffer): SlotOffer {
  assertPending(offer);
  return { ...offer, status: "expirada", closedAt: offer.expiresAt };
}

export function respondToOffer(
  offer: SlotOffer,
  response: SlotOfferResponse,
  respondedAt: string,
): SlotOffer {
  if (offer.status === "expirada" || isOfferExpired(offer, respondedAt)) {
    throw new SlotOfferError(
      "OFFER_EXPIRED",
      `O prazo da oferta "${offer.id}" acabou; a vaga passou para o próximo da fila.`,
    );
  }
  assertPending(offer);
  return {
    ...offer,
    status: response === "aceitar" ? "aceita" : "recusada",
    closedAt: respondedAt,
  };
}
