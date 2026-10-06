import { hasDatabaseConfig } from "@/lib/database/env";
import { InMemorySlotOfferRepository } from "./in-memory-slot-offer-repository";
import { PrismaSlotOfferRepository } from "./prisma-slot-offer-repository";
import type { SlotOfferRepository } from "./slot-offer-repository";

/**
 * Usa o Postgres (Prisma) quando DATABASE_URL está definida.
 * Sem isso, guarda as ofertas em memória.
 */
export function createSlotOfferRepository(): SlotOfferRepository {
  if (hasDatabaseConfig()) {
    return new PrismaSlotOfferRepository();
  }
  return new InMemorySlotOfferRepository();
}
