"use client";

import { useEffect } from "react";
import type { Appointment } from "@/domain/appointment";
import type {
  SlotOffer,
  SlotOfferCascade,
  SlotOfferResponse,
  SlotOfferTimeout,
} from "@/domain/slot-offer";
import type { WaitlistEntry } from "@/domain/waitlist";
import { type Fetcher, getApiJson, postApiJson } from "@/lib/http";
import { type AsyncResourceState, useAsyncResource } from "./use-async-resource";

export type SlotOffersState = AsyncResourceState<SlotOfferCascade[]>;

/** Enquanto houver oferta aguardando resposta, o painel busca de novo nesse intervalo. */
export const SLOT_OFFERS_POLL_MS = 10_000;

const FALLBACK_ERROR = "Falha ao carregar as ofertas de vaga.";

export async function fetchSlotOffers(fetcher: Fetcher = fetch): Promise<SlotOfferCascade[]> {
  const { cascades } = await getApiJson<{ cascades?: SlotOfferCascade[] }>(
    "/api/slot-offers",
    FALLBACK_ERROR,
    fetcher,
  );
  if (!cascades) {
    throw new Error(FALLBACK_ERROR);
  }
  return cascades;
}

export async function requestStartSlotOffer(
  appointmentId: string,
  timeoutMinutes: SlotOfferTimeout,
  fetcher: Fetcher = fetch,
): Promise<SlotOffer> {
  const { offer } = await postApiJson<{ offer?: SlotOffer }>(
    `/api/appointments/${encodeURIComponent(appointmentId)}/slot-offers`,
    { timeoutMinutes },
    "Falha ao iniciar a oferta da vaga.",
    fetcher,
  );
  if (!offer) {
    throw new Error("A API não devolveu a oferta criada.");
  }
  return offer;
}

export type SlotOfferResponseResult = {
  response: SlotOfferResponse;
  offer: SlotOffer;
  appointment?: Appointment;
  candidate?: WaitlistEntry;
  nextOffer?: SlotOffer | null;
};

export async function requestSlotOfferResponse(
  offerId: string,
  response: SlotOfferResponse,
  fetcher: Fetcher = fetch,
): Promise<SlotOfferResponseResult> {
  return postApiJson<SlotOfferResponseResult>(
    `/api/slot-offers/${encodeURIComponent(offerId)}/response`,
    { response },
    "Falha ao registrar a resposta da oferta.",
    fetcher,
  );
}

export function hasPendingOffer(cascades: readonly SlotOfferCascade[]): boolean {
  return cascades.some((cascade) => cascade.state === "em_andamento");
}

export function acceptedOfferIds(cascades: readonly SlotOfferCascade[]): Set<string> {
  return new Set(
    cascades.flatMap((cascade) =>
      cascade.offers.filter((offer) => offer.status === "aceita").map((offer) => offer.id),
    ),
  );
}

const loadSlotOffers = () => fetchSlotOffers();

/** Histórico das ofertas, com consulta periódica só enquanto alguma aguarda resposta. */
export function useSlotOffers() {
  const resource = useAsyncResource(loadSlotOffers);
  const { state, refresh } = resource;
  const shouldPoll = state.status === "ready" && hasPendingOffer(state.data);

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = setInterval(() => void refresh(), SLOT_OFFERS_POLL_MS);
    return () => clearInterval(timer);
  }, [shouldPoll, refresh]);

  return resource;
}
