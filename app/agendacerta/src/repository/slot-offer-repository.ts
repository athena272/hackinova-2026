import type { SlotOffer } from "@/domain/slot-offer";

export const DEFAULT_RECENT_OFFERS_LIMIT = 100;

export interface SlotOfferRepository {
  /** Mais recentes primeiro. */
  listRecent(limit?: number): Promise<SlotOffer[]>;
  /** Ofertas aguardando resposta, de todas as vagas. */
  listPending(): Promise<SlotOffer[]>;
  /** Todas as ofertas da vaga, da primeira para a última. */
  listByAppointment(appointmentId: string): Promise<SlotOffer[]>;
  getById(id: string): Promise<SlotOffer | null>;
  /** Lança SlotOfferConflictError se a vaga ou o candidato já tiver oferta pendente. */
  create(offer: SlotOffer): Promise<SlotOffer>;
  /**
   * Grava o status final e o closedAt só se a oferta ainda estiver pendente.
   * Devolve false quando outra requisição já fechou a oferta.
   */
  close(offer: SlotOffer): Promise<boolean>;
}
