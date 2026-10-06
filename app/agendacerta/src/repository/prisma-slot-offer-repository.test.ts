import { beforeEach, describe, expect, it, vi } from "vitest";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import { Prisma } from "@/generated/prisma/client";
import { SlotOfferConflictError } from "./errors";
import { slotOfferSelect } from "./mappers";
import { PrismaSlotOfferRepository } from "./prisma-slot-offer-repository";

const offer = pendingOffer();

const record = {
  id: offer.id,
  appointmentId: offer.appointmentId,
  status: "pendente" as const,
  offeredAt: new Date(offer.offeredAt),
  expiresAt: new Date(offer.expiresAt),
  closedAt: null,
  timeoutMinutes: 15,
  distanceKm: new Prisma.Decimal("3.7"),
  candidate: { id: "wl-002", patient: { id: "pat-igor", fullName: "Igor Santos" } },
};

function setup() {
  const slotOffer = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  };
  const repo = new PrismaSlotOfferRepository(() => ({ slotOffer }) as never);
  return { slotOffer, repo };
}

describe("PrismaSlotOfferRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listRecent traz as mais recentes primeiro, com limite, e converte Decimal e datas", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findMany.mockResolvedValue([record]);

    await expect(repo.listRecent(20)).resolves.toEqual([offer]);
    expect(slotOffer.findMany).toHaveBeenCalledWith({
      select: slotOfferSelect,
      orderBy: [{ offeredAt: "desc" }, { id: "desc" }],
      take: 20,
    });
  });

  it("listPending e listByAppointment filtram e ordenam da primeira para a última", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findMany.mockResolvedValue([]);

    await repo.listPending();
    await repo.listByAppointment("apt-006");

    const order = [{ offeredAt: "asc" }, { id: "asc" }];
    expect(slotOffer.findMany).toHaveBeenNthCalledWith(1, {
      where: { status: "pendente" },
      select: slotOfferSelect,
      orderBy: order,
    });
    expect(slotOffer.findMany).toHaveBeenNthCalledWith(2, {
      where: { appointmentId: "apt-006" },
      select: slotOfferSelect,
      orderBy: order,
    });
  });

  it("distância desconhecida e oferta encerrada saem como null e ISO", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findUnique.mockResolvedValue({
      ...record,
      status: "recusada",
      closedAt: new Date("2026-10-06T15:02:00.000Z"),
      distanceKm: null,
    });

    await expect(repo.getById(offer.id)).resolves.toMatchObject({
      status: "recusada",
      closedAt: "2026-10-06T15:02:00.000Z",
      distanceKm: null,
    });
  });

  it("getById devolve null quando a oferta não existe", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findUnique.mockResolvedValue(null);

    await expect(repo.getById("offer-999")).resolves.toBeNull();
  });

  it("create grava as colunas da oferta", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.create.mockResolvedValue(record);

    await expect(repo.create(offer)).resolves.toEqual(offer);
    expect(slotOffer.create).toHaveBeenCalledWith({
      data: {
        id: offer.id,
        appointmentId: "apt-006",
        waitlistId: "wl-002",
        status: "pendente",
        offeredAt: new Date(offer.offeredAt),
        expiresAt: new Date(offer.expiresAt),
        closedAt: null,
        timeoutMinutes: 15,
        distanceKm: 3.7,
      },
      select: slotOfferSelect,
    });
  });

  it("create converte P2002 (índice único parcial) em SlotOfferConflictError", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.0",
      }),
    );

    await expect(repo.create(offer)).rejects.toBeInstanceOf(SlotOfferConflictError);
  });

  it("close só atualiza se ainda estiver pendente e diz se fechou", async () => {
    const { slotOffer, repo } = setup();
    const closed = { ...offer, status: "expirada" as const, closedAt: offer.expiresAt };
    slotOffer.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repo.close(closed)).resolves.toBe(true);
    await expect(repo.close(closed)).resolves.toBe(false);
    expect(slotOffer.updateMany).toHaveBeenCalledWith({
      where: { id: offer.id, status: "pendente" },
      data: { status: "expirada", closedAt: new Date(offer.expiresAt) },
    });
  });

  it("propaga falhas com contexto legível", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findMany.mockRejectedValue(new Error("relation does not exist"));
    slotOffer.updateMany.mockRejectedValue(new Error("timeout"));

    await expect(repo.listPending()).rejects.toThrow(
      "Falha ao listar ofertas pendentes: relation does not exist",
    );
    await expect(repo.close(offer)).rejects.toThrow("Falha ao encerrar oferta de vaga: timeout");
  });

  it("recusa prazo fora das opções vindo do banco em vez de devolver dado inconsistente", async () => {
    const { slotOffer, repo } = setup();
    slotOffer.findUnique.mockResolvedValue({ ...record, timeoutMinutes: 7 });

    await expect(repo.getById(offer.id)).rejects.toThrow(/Prazo de resposta inválido/);
  });
});
