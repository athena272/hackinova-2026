import { groupOffersByAppointment, type SlotOfferCascade } from "@/domain/slot-offer";
import type { SlotOfferDeps } from "./deps";
import { syncSlotOffers } from "./sync-slot-offers";

/** Histórico por vaga, já com os prazos vencidos aplicados. */
export async function listSlotOffers(deps: SlotOfferDeps): Promise<SlotOfferCascade[]> {
  await syncSlotOffers(deps);
  return groupOffersByAppointment(await deps.offers.listRecent());
}
