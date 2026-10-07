import { beforeEach, describe, expect, it } from "vitest";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { OfferSlotError } from "@/domain/offer-slot";
import { SlotOfferError } from "@/domain/slot-offer";
import { AppointmentNotFoundError, SlotOfferNotFoundError } from "@/repository/errors";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import {
  InMemoryOverbookingRepository,
  resetOverbookingStoreForTests,
} from "@/repository/in-memory-overbooking-repository";
import { InMemoryPatientRepository } from "@/repository/in-memory-patient-repository";
import {
  InMemorySlotOfferRepository,
  resetSlotOfferStoreForTests,
} from "@/repository/in-memory-slot-offer-repository";
import {
  InMemoryWaitlistRepository,
  resetWaitlistStoreForTests,
} from "@/repository/in-memory-waitlist-repository";
import type { SlotOfferDeps } from "./deps";
import { listSlotOffers } from "./list-slot-offers";
import { respondSlotOffer } from "./respond-slot-offer";
import { startSlotOffer } from "./start-slot-offer";
import { syncSlotOffers } from "./sync-slot-offers";

/** Manhã do dia da vaga apt-006 (18:45 UTC): a oferta de última hora acontece antes da consulta. */
const START = "2026-09-23T12:00:00.000Z";
const MINUTE_MS = 60_000;

/** Seed real: apt-006 é Endocrinologia liberada; Igor (wl-002), Lucas (wl-007) e Elena (wl-008) aguardam. */
function setup() {
  let current = new Date(START);
  let sequence = 0;
  const deps: SlotOfferDeps = {
    appointments: new InMemoryAppointmentRepository(),
    waitlist: new InMemoryWaitlistRepository(),
    patients: new InMemoryPatientRepository(),
    offers: new InMemorySlotOfferRepository(),
    overbookings: new InMemoryOverbookingRepository(),
    now: () => current,
    newOfferId: () => `offer-${++sequence}`,
    clinicNeighborhoodId: CLINIC_NEIGHBORHOOD_ID,
  };
  const advanceMinutes = (minutes: number) => {
    current = new Date(current.getTime() + minutes * MINUTE_MS);
  };
  const nowIso = () => current.toISOString();
  return { deps, advanceMinutes, nowIso };
}

async function expectSlotOfferError(promise: Promise<unknown>, code: SlotOfferError["code"]) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(SlotOfferError);
  expect((error as SlotOfferError).code).toBe(code);
}

describe("casos de uso da oferta em cascata", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetWaitlistStoreForTests();
    resetSlotOfferStoreForTests();
    resetOverbookingStoreForTests();
  });

  describe("startSlotOffer", () => {
    it("oferece primeiro a quem está perto e espera há mais tempo, com o prazo escolhido", async () => {
      const { deps } = setup();

      const offer = await startSlotOffer(deps, "apt-006", 5);

      expect(offer).toMatchObject({
        id: "offer-1",
        appointmentId: "apt-006",
        candidate: { waitlistId: "wl-002", patientName: "Igor Santos" },
        status: "pendente",
        offeredAt: START,
        expiresAt: "2026-09-23T12:05:00.000Z",
        timeoutMinutes: 5,
      });
      expect(offer.distanceKm).toBeGreaterThan(0);
      expect(offer.distanceKm).toBeLessThanOrEqual(5);
    });

    it("recusa prazo inválido sem gravar nada", async () => {
      const { deps } = setup();

      await expectSlotOfferError(startSlotOffer(deps, "apt-006", 7), "INVALID_TIMEOUT");
      await expect(deps.offers.listRecent()).resolves.toEqual([]);
    });

    it("recusa vaga que não está liberada", async () => {
      const { deps } = setup();
      await expectSlotOfferError(startSlotOffer(deps, "apt-007", 15), "SLOT_NOT_REUSABLE");
    });

    it("recusa começar de novo enquanto a oferta aguarda resposta", async () => {
      const { deps } = setup();
      await startSlotOffer(deps, "apt-006", 15);

      await expectSlotOfferError(startSlotOffer(deps, "apt-006", 15), "CASCADE_ALREADY_ACTIVE");
    });

    it("avisa quando a vaga não existe", async () => {
      const { deps } = setup();
      await expect(startSlotOffer(deps, "apt-999", 15)).rejects.toBeInstanceOf(
        AppointmentNotFoundError,
      );
    });

    it("avisa quando ninguém da especialidade está na fila", async () => {
      const { deps } = setup();
      for (const id of ["wl-002", "wl-007", "wl-008"]) {
        const entry = await deps.waitlist.getById(id);
        await deps.waitlist.saveAssigned({ ...entry!, status: "atribuido" });
      }

      await expectSlotOfferError(startSlotOffer(deps, "apt-006", 15), "NO_CANDIDATES");
    });

    it("nunca abre duas ofertas para o mesmo candidato: quem já tem oferta em outra vaga é pulado", async () => {
      const { deps } = setup();
      const other = await deps.appointments.getById("hist-004");
      await deps.appointments.saveReleased({ ...other!, status: "liberado" });

      const first = await startSlotOffer(deps, "apt-006", 15);
      const second = await startSlotOffer(deps, "hist-004", 15);

      expect(first.candidate.waitlistId).toBe("wl-002");
      expect(second.candidate.waitlistId).toBe("wl-007");
    });
  });

  describe("respondSlotOffer", () => {
    it("recusa passa ao próximo, e a fila vazia encerra a cascata com a vaga ainda liberada", async () => {
      const { deps } = setup();
      const first = await startSlotOffer(deps, "apt-006", 15);

      const igor = await respondSlotOffer(deps, first.id, "recusar");
      expect(igor).toMatchObject({ offer: { status: "recusada", closedAt: START } });
      const second = igor.response === "recusar" ? igor.nextOffer : null;
      expect(second?.candidate.waitlistId).toBe("wl-007");

      const lucas = await respondSlotOffer(deps, second!.id, "recusar");
      const third = lucas.response === "recusar" ? lucas.nextOffer : null;
      expect(third?.candidate.waitlistId).toBe("wl-008");

      const elena = await respondSlotOffer(deps, third!.id, "recusar");
      expect(elena).toMatchObject({ response: "recusar", nextOffer: null });

      const [cascade] = await listSlotOffers(deps);
      expect(cascade.state).toBe("encerrada");
      expect(cascade.offers.map((offer) => offer.candidate.waitlistId)).toEqual([
        "wl-002",
        "wl-007",
        "wl-008",
      ]);
      expect((await deps.appointments.getById("apt-006"))?.status).toBe("liberado");
    });

    it("aceite confirma a vaga para o candidato e o tira da fila", async () => {
      const { deps, advanceMinutes, nowIso } = setup();
      const offer = await startSlotOffer(deps, "apt-006", 15);
      advanceMinutes(3);

      const result = await respondSlotOffer(deps, offer.id, "aceitar");

      expect(result).toMatchObject({
        response: "aceitar",
        offer: { status: "aceita", closedAt: nowIso() },
        appointment: {
          id: "apt-006",
          patientName: "Igor Santos",
          status: "confirmado",
          bookedAt: nowIso(),
        },
        candidate: { id: "wl-002", status: "atribuido" },
      });
      expect((await deps.appointments.getById("apt-006"))?.status).toBe("confirmado");
      expect((await deps.waitlist.getById("wl-002"))?.status).toBe("atribuido");
      expect((await listSlotOffers(deps))[0].state).toBe("aceita");
      await expectSlotOfferError(startSlotOffer(deps, "apt-006", 15), "SLOT_NOT_REUSABLE");
    });

    it("aceite depois do prazo é recusado e a vaga já passou ao próximo", async () => {
      const { deps, advanceMinutes } = setup();
      const offer = await startSlotOffer(deps, "apt-006", 2);
      advanceMinutes(2);

      await expectSlotOfferError(respondSlotOffer(deps, offer.id, "aceitar"), "OFFER_EXPIRED");

      expect((await deps.appointments.getById("apt-006"))?.status).toBe("liberado");
      const pending = await deps.offers.listPending();
      expect(pending.map((item) => item.candidate.waitlistId)).toEqual(["wl-007"]);
    });

    it("se a regra do aceite falhar, a oferta continua aberta", async () => {
      const { deps } = setup();
      const offer = await startSlotOffer(deps, "apt-006", 15);
      const igor = await deps.waitlist.getById("wl-002");
      await deps.waitlist.saveAssigned({ ...igor!, status: "atribuido" });

      await expect(respondSlotOffer(deps, offer.id, "aceitar")).rejects.toBeInstanceOf(
        OfferSlotError,
      );
      expect((await deps.offers.getById(offer.id))?.status).toBe("pendente");
    });

    it("responder de novo a uma oferta encerrada é recusado", async () => {
      const { deps } = setup();
      const offer = await startSlotOffer(deps, "apt-006", 15);
      await respondSlotOffer(deps, offer.id, "recusar");

      await expectSlotOfferError(respondSlotOffer(deps, offer.id, "aceitar"), "OFFER_NOT_PENDING");
    });

    it("avisa quando a oferta não existe", async () => {
      const { deps } = setup();
      await expect(respondSlotOffer(deps, "offer-999", "aceitar")).rejects.toBeInstanceOf(
        SlotOfferNotFoundError,
      );
    });
  });

  describe("repasse automático por prazo", () => {
    it("expira no fim do prazo e oferece ao próximo com prazo contando de agora", async () => {
      const { deps, advanceMinutes, nowIso } = setup();
      const first = await startSlotOffer(deps, "apt-006", 2);
      advanceMinutes(3);

      const [cascade] = await listSlotOffers(deps);

      expect(cascade.state).toBe("em_andamento");
      expect(cascade.offers).toHaveLength(2);
      expect(cascade.offers[0]).toMatchObject({
        id: first.id,
        status: "expirada",
        closedAt: first.expiresAt,
      });
      expect(cascade.offers[1]).toMatchObject({
        candidate: { waitlistId: "wl-007" },
        status: "pendente",
        offeredAt: nowIso(),
        timeoutMinutes: 2,
      });
    });

    it("antes do prazo, nada muda", async () => {
      const { deps, advanceMinutes } = setup();
      await startSlotOffer(deps, "apt-006", 2);
      advanceMinutes(1);

      await expect(syncSlotOffers(deps)).resolves.toEqual({ expired: [], created: [] });
    });

    it("com a fila vazia, a última expiração encerra a cascata", async () => {
      const { deps, advanceMinutes } = setup();
      for (const id of ["wl-007", "wl-008"]) {
        const entry = await deps.waitlist.getById(id);
        await deps.waitlist.saveAssigned({ ...entry!, status: "atribuido" });
      }
      await startSlotOffer(deps, "apt-006", 2);
      advanceMinutes(2);

      const result = await syncSlotOffers(deps);

      expect(result.expired).toHaveLength(1);
      expect(result.created).toEqual([]);
      expect((await listSlotOffers(deps))[0].state).toBe("encerrada");
    });

    it("duas sincronizações ao mesmo tempo não repassam a vaga em dobro", async () => {
      const { deps, advanceMinutes } = setup();
      await startSlotOffer(deps, "apt-006", 2);
      advanceMinutes(2);

      const [a, b] = await Promise.all([syncSlotOffers(deps), syncSlotOffers(deps)]);

      expect(a.expired.length + b.expired.length).toBe(1);
      expect(a.created.length + b.created.length).toBe(1);
      expect(await deps.offers.listPending()).toHaveLength(1);
      expect(await deps.offers.listRecent()).toHaveLength(2);
    });

    it("se a vaga deixou de estar liberada, não repassa", async () => {
      const { deps, advanceMinutes } = setup();
      await startSlotOffer(deps, "apt-006", 2);
      const slot = await deps.appointments.getById("apt-006");
      await deps.appointments.saveOffered({ ...slot!, status: "confirmado" });
      advanceMinutes(2);

      const result = await syncSlotOffers(deps);

      expect(result.expired).toHaveLength(1);
      expect(result.created).toEqual([]);
    });
  });
});
