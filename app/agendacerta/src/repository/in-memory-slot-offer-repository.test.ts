import { beforeEach, describe, expect, it } from "vitest";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import { SlotOfferConflictError } from "./errors";
import {
  InMemorySlotOfferRepository,
  resetSlotOfferStoreForTests,
} from "./in-memory-slot-offer-repository";

const otherCandidate = { waitlistId: "wl-007", patientId: "pat-lucas", patientName: "Lucas Ferreira" };

describe("InMemorySlotOfferRepository", () => {
  beforeEach(() => {
    resetSlotOfferStoreForTests();
  });

  it("cria, busca e lista por vaga em ordem de oferta", async () => {
    const repo = new InMemorySlotOfferRepository();
    const first = pendingOffer({ status: "recusada", closedAt: "2026-10-06T15:01:00.000Z" });
    const second = pendingOffer({
      id: "offer-2",
      offeredAt: "2026-10-06T15:01:00.000Z",
      candidate: otherCandidate,
    });
    await repo.create(second);
    await repo.create(first);

    await expect(repo.getById("offer-2")).resolves.toEqual(second);
    await expect(repo.getById("offer-999")).resolves.toBeNull();
    expect((await repo.listByAppointment("apt-006")).map((offer) => offer.id)).toEqual([
      "offer-1",
      "offer-2",
    ]);
    expect((await repo.listRecent()).map((offer) => offer.id)).toEqual(["offer-2", "offer-1"]);
    expect((await repo.listRecent(1)).map((offer) => offer.id)).toEqual(["offer-2"]);
    expect((await repo.listPending()).map((offer) => offer.id)).toEqual(["offer-2"]);
  });

  it("reproduz os índices únicos: uma oferta aberta por vaga e por candidato", async () => {
    const repo = new InMemorySlotOfferRepository();
    await repo.create(pendingOffer());

    await expect(
      repo.create(pendingOffer({ id: "offer-2", candidate: otherCandidate })),
    ).rejects.toBeInstanceOf(SlotOfferConflictError);
    await expect(
      repo.create(pendingOffer({ id: "offer-3", appointmentId: "apt-099" })),
    ).rejects.toBeInstanceOf(SlotOfferConflictError);
    await expect(
      repo.create(pendingOffer({ id: "offer-4", appointmentId: "apt-099", candidate: otherCandidate })),
    ).resolves.toMatchObject({ id: "offer-4" });
  });

  it("fecha só a oferta ainda pendente", async () => {
    const repo = new InMemorySlotOfferRepository();
    const offer = await repo.create(pendingOffer());
    const refused = { ...offer, status: "recusada" as const, closedAt: "2026-10-06T15:02:00.000Z" };

    await expect(repo.close(refused)).resolves.toBe(true);
    await expect(repo.close({ ...refused, status: "aceita" })).resolves.toBe(false);
    await expect(repo.getById(offer.id)).resolves.toMatchObject({ status: "recusada" });
    await expect(repo.close(pendingOffer({ id: "offer-999" }))).resolves.toBe(false);
  });

  it("listAccepted traz só as aceitas, na ordem do aceite, com o motivo da liberação", async () => {
    const repo = new InMemorySlotOfferRepository();
    await repo.create(
      pendingOffer({ id: "offer-late", status: "aceita", closedAt: "2026-10-06T16:00:00.000Z", releaseReason: "preparo" }),
    );
    await repo.create(
      pendingOffer({ id: "offer-early", appointmentId: "apt-099", status: "aceita", closedAt: "2026-10-06T15:05:00.000Z" }),
    );
    await repo.create(pendingOffer({ id: "offer-refused", status: "recusada", closedAt: "2026-10-06T15:02:00.000Z" }));

    const accepted = await repo.listAccepted();

    expect(accepted.map(({ id, releaseReason }) => [id, releaseReason])).toEqual([
      ["offer-early", "cancelamento"],
      ["offer-late", "preparo"],
    ]);
  });

  it("devolve cópias: alterar o retorno não muda o store", async () => {
    const repo = new InMemorySlotOfferRepository();
    const created = await repo.create(pendingOffer());
    created.candidate.patientName = "Outro";

    await expect(repo.getById("offer-1")).resolves.toMatchObject({
      candidate: { patientName: "Igor Santos" },
    });
  });
});
