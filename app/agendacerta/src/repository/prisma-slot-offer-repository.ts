import type { SlotOffer } from "@/domain/slot-offer";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  describeDatabaseError,
  isUniqueConstraintError,
} from "@/lib/database/errors";
import { getPrisma } from "@/lib/database/prisma";
import { SlotOfferConflictError } from "./errors";
import { mapRecordToSlotOffer, slotOfferSelect } from "./mappers";
import {
  DEFAULT_RECENT_OFFERS_LIMIT,
  type SlotOfferRepository,
} from "./slot-offer-repository";

type SlotOfferClient = Pick<PrismaClient, "slotOffer">;

export class PrismaSlotOfferRepository implements SlotOfferRepository {
  constructor(private readonly getClient: () => SlotOfferClient = getPrisma) {}

  async listRecent(limit: number = DEFAULT_RECENT_OFFERS_LIMIT): Promise<SlotOffer[]> {
    try {
      const records = await this.getClient().slotOffer.findMany({
        select: slotOfferSelect,
        orderBy: [{ offeredAt: "desc" }, { id: "desc" }],
        take: limit,
      });
      return records.map(mapRecordToSlotOffer);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar ofertas de vaga", error);
    }
  }

  async listPending(): Promise<SlotOffer[]> {
    try {
      const records = await this.getClient().slotOffer.findMany({
        where: { status: "pendente" },
        select: slotOfferSelect,
        orderBy: [{ offeredAt: "asc" }, { id: "asc" }],
      });
      return records.map(mapRecordToSlotOffer);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar ofertas pendentes", error);
    }
  }

  async listAccepted(): Promise<SlotOffer[]> {
    try {
      const records = await this.getClient().slotOffer.findMany({
        where: { status: "aceita" },
        select: slotOfferSelect,
        orderBy: [{ closedAt: "asc" }, { id: "asc" }],
      });
      return records.map(mapRecordToSlotOffer);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar ofertas aceitas", error);
    }
  }

  async listByAppointment(appointmentId: string): Promise<SlotOffer[]> {
    try {
      const records = await this.getClient().slotOffer.findMany({
        where: { appointmentId },
        select: slotOfferSelect,
        orderBy: [{ offeredAt: "asc" }, { id: "asc" }],
      });
      return records.map(mapRecordToSlotOffer);
    } catch (error) {
      throw describeDatabaseError("Falha ao listar ofertas da vaga", error);
    }
  }

  async getById(id: string): Promise<SlotOffer | null> {
    try {
      const record = await this.getClient().slotOffer.findUnique({
        where: { id },
        select: slotOfferSelect,
      });
      return record ? mapRecordToSlotOffer(record) : null;
    } catch (error) {
      throw describeDatabaseError("Falha ao buscar oferta de vaga", error);
    }
  }

  async create(offer: SlotOffer): Promise<SlotOffer> {
    try {
      const record = await this.getClient().slotOffer.create({
        data: {
          id: offer.id,
          appointmentId: offer.appointmentId,
          waitlistId: offer.candidate.waitlistId,
          status: offer.status,
          offeredAt: new Date(offer.offeredAt),
          expiresAt: new Date(offer.expiresAt),
          closedAt: offer.closedAt ? new Date(offer.closedAt) : null,
          timeoutMinutes: offer.timeoutMinutes,
          distanceKm: offer.distanceKm,
          releaseReason: offer.releaseReason,
        },
        select: slotOfferSelect,
      });
      return mapRecordToSlotOffer(record);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new SlotOfferConflictError(offer.id, { cause: error });
      }
      throw describeDatabaseError("Falha ao criar oferta de vaga", error);
    }
  }

  async close(offer: SlotOffer): Promise<boolean> {
    try {
      const { count } = await this.getClient().slotOffer.updateMany({
        where: { id: offer.id, status: "pendente" },
        data: {
          status: offer.status,
          closedAt: offer.closedAt ? new Date(offer.closedAt) : null,
        },
      });
      return count > 0;
    } catch (error) {
      throw describeDatabaseError("Falha ao encerrar oferta de vaga", error);
    }
  }
}
