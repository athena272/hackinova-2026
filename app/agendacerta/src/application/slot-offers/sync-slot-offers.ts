import { expireOffer, isOfferExpired, type SlotOffer } from "@/domain/slot-offer";
import type { SlotOfferDeps } from "./deps";
import { passSlotToNextCandidate } from "./offer-to-next-candidate";

export type SyncSlotOffersResult = {
  expired: SlotOffer[];
  created: SlotOffer[];
};

/**
 * Aplica os prazos vencidos: expira cada oferta e repassa a vaga ao próximo,
 * com o prazo contando a partir de agora. Não há job em segundo plano; isso
 * roda sempre que alguém lê ou responde ofertas.
 */
export async function syncSlotOffers(deps: SlotOfferDeps): Promise<SyncSlotOffersResult> {
  const now = deps.now().toISOString();
  const pending = await deps.offers.listPending();
  const result: SyncSlotOffersResult = { expired: [], created: [] };

  for (const offer of pending.filter((item) => isOfferExpired(item, now))) {
    const expired = expireOffer(offer);
    const closedHere = await deps.offers.close(expired);
    if (!closedHere) continue;

    result.expired.push(expired);
    const next = await passSlotToNextCandidate(deps, expired, now);
    if (next) result.created.push(next);
  }

  return result;
}
