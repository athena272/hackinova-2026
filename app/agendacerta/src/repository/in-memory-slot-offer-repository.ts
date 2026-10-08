import type { SlotOffer } from "@/domain/slot-offer";
import { SlotOfferConflictError } from "./errors";
import {
  DEFAULT_RECENT_OFFERS_LIMIT,
  type SlotOfferRepository,
} from "./slot-offer-repository";

type Store = {
  offers: Map<string, SlotOffer>;
};

const GLOBAL_KEY = "__agendacerta_slot_offer_store__";

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };

  if (!globalRef[GLOBAL_KEY]) {
    globalRef[GLOBAL_KEY] = { offers: new Map() };
  }

  return globalRef[GLOBAL_KEY];
}

function copy(offer: SlotOffer): SlotOffer {
  return { ...offer, candidate: { ...offer.candidate } };
}

function byOfferedAtAsc(a: SlotOffer, b: SlotOffer): number {
  return Date.parse(a.offeredAt) - Date.parse(b.offeredAt) || a.id.localeCompare(b.id);
}

export class InMemorySlotOfferRepository implements SlotOfferRepository {
  async listRecent(limit: number = DEFAULT_RECENT_OFFERS_LIMIT): Promise<SlotOffer[]> {
    return Array.from(getStore().offers.values())
      .sort((a, b) => byOfferedAtAsc(b, a))
      .slice(0, limit)
      .map(copy);
  }

  async listPending(): Promise<SlotOffer[]> {
    return Array.from(getStore().offers.values())
      .filter((offer) => offer.status === "pendente")
      .sort(byOfferedAtAsc)
      .map(copy);
  }

  async listAccepted(): Promise<SlotOffer[]> {
    return Array.from(getStore().offers.values())
      .filter((offer) => offer.status === "aceita")
      .sort(
        (a, b) =>
          Date.parse(a.closedAt ?? a.offeredAt) - Date.parse(b.closedAt ?? b.offeredAt) ||
          a.id.localeCompare(b.id),
      )
      .map(copy);
  }

  async listByAppointment(appointmentId: string): Promise<SlotOffer[]> {
    return Array.from(getStore().offers.values())
      .filter((offer) => offer.appointmentId === appointmentId)
      .sort(byOfferedAtAsc)
      .map(copy);
  }

  async getById(id: string): Promise<SlotOffer | null> {
    const found = getStore().offers.get(id);
    return found ? copy(found) : null;
  }

  /** Reproduz os índices únicos parciais do banco. */
  async create(offer: SlotOffer): Promise<SlotOffer> {
    const { offers } = getStore();
    const clashes = Array.from(offers.values()).some(
      (existing) =>
        existing.id === offer.id ||
        (offer.status === "pendente" &&
          existing.status === "pendente" &&
          (existing.appointmentId === offer.appointmentId ||
            existing.candidate.waitlistId === offer.candidate.waitlistId)),
    );
    if (clashes) {
      throw new SlotOfferConflictError(offer.id);
    }
    offers.set(offer.id, copy(offer));
    return copy(offer);
  }

  async close(offer: SlotOffer): Promise<boolean> {
    const { offers } = getStore();
    const current = offers.get(offer.id);
    if (!current || current.status !== "pendente") {
      return false;
    }
    offers.set(offer.id, { ...current, status: offer.status, closedAt: offer.closedAt });
    return true;
  }
}

/** Apenas para testes: apaga todas as ofertas. */
export function resetSlotOfferStoreForTests(): void {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };
  delete globalRef[GLOBAL_KEY];
}
