import { beforeEach, describe, expect, it } from "vitest";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import {
  MAX_OVERBOOKINGS_PER_BLOCK,
  OverbookingError,
  type OverbookingOverview,
  type OverbookingSuggestion,
} from "@/domain/overbooking";
import { SlotOfferError } from "@/domain/slot-offer";
import { AppointmentNotFoundError } from "@/repository/errors";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import { InMemoryDuplicateCheckRepository } from "@/repository/in-memory-duplicate-check-repository";
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
import { scoreAppointmentsRisk } from "../score-appointments-risk";
import type { SlotOfferDeps } from "../slot-offers/deps";
import { respondSlotOffer } from "../slot-offers/respond-slot-offer";
import { startSlotOffer } from "../slot-offers/start-slot-offer";
import { decideOverbooking } from "./decide-overbooking";
import type { OverbookingDeps } from "./deps";
import { listOverbookings } from "./list-overbookings";

/** Véspera da consulta da Ana Souza (apt-001, Neurologia, 22/09 09:00 -03:00, risco alto). */
const NOW = "2026-09-21T12:00:00.000Z";
const ANCHOR = "apt-001";

/** Seed real: na Neurologia aguardam Helena Dias (wl-001) e Karen Oliveira (wl-004). */
function setup() {
  let ids = 0;
  const deps: SlotOfferDeps & OverbookingDeps = {
    appointments: new InMemoryAppointmentRepository(),
    waitlist: new InMemoryWaitlistRepository(),
    patients: new InMemoryPatientRepository(),
    offers: new InMemorySlotOfferRepository(),
    overbookings: new InMemoryOverbookingRepository(),
    duplicateChecks: new InMemoryDuplicateCheckRepository(),
    now: () => new Date(NOW),
    newOfferId: () => `offer-${++ids}`,
    newEncaixeId: () => `apt-enc-${++ids}`,
    newOverbookingId: () => `ovb-${++ids}`,
    clinicNeighborhoodId: CLINIC_NEIGHBORHOOD_ID,
  };
  return deps;
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (reason: unknown) => reason,
  );
}

async function expectOverbookingError(promise: Promise<unknown>, code: OverbookingError["code"]) {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(OverbookingError);
  expect((error as OverbookingError).code).toBe(code);
}

async function expectSlotOfferError(promise: Promise<unknown>, code: SlotOfferError["code"]) {
  const error = await rejection(promise);
  expect(error).toBeInstanceOf(SlotOfferError);
  expect((error as SlotOfferError).code).toBe(code);
}

function suggestionFor(suggestions: readonly OverbookingSuggestion[], anchorId: string) {
  const found = suggestions.find((item) => item.anchor.id === anchorId);
  if (!found) throw new Error(`Sem sugestão para ${anchorId}`);
  return found;
}

function anchorIds(overview: OverbookingOverview): string[] {
  return overview.suggestions.map((item) => item.anchor.id);
}

async function acceptEncaixe(deps: OverbookingDeps) {
  const result = await decideOverbooking(deps, ANCHOR, "aceitar");
  if (result.decision !== "aceitar") throw new Error("esperava aceite");
  return result;
}

describe("casos de uso do encaixe guiado pelo score", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetWaitlistStoreForTests();
    resetSlotOfferStoreForTests();
    resetOverbookingStoreForTests();
  });

  describe("listOverbookings", () => {
    it("sugere encaixe só em blocos de risco alto, com os motivos do score e o candidato", async () => {
      const deps = setup();
      const overview = await listOverbookings(deps);
      const risks = await scoreAppointmentsRisk(deps.appointments, deps.patients);
      const notHigh = new Set(risks.filter((risk) => risk.band !== "alto").map((risk) => risk.appointmentId));

      expect(overview.suggestions.length).toBeGreaterThan(0);
      expect(overview.suggestions.every((item) => item.risk.band === "alto")).toBe(true);
      expect(overview.suggestions.some((item) => notHigh.has(item.anchor.id))).toBe(false);

      const suggestion = suggestionFor(overview.suggestions, ANCHOR);
      expect(suggestion.anchor.patientName).toBe("Ana Souza");
      expect(suggestion.risk.reasons.length).toBeGreaterThan(0);
      expect(suggestion).toMatchObject({ acceptedCount: 0, limit: MAX_OVERBOOKINGS_PER_BLOCK });
      expect(["wl-001", "wl-004"]).toContain(suggestion.candidate.waitlistId);
      expect(overview.encaixeAppointmentIds).toEqual([]);
      expect(overview.coveredAppointmentIds).toEqual([]);
    });

    it("não sugere quando a lista de espera da especialidade está vazia", async () => {
      const deps = setup();
      for (const id of ["wl-001", "wl-004"]) {
        const entry = await deps.waitlist.getById(id);
        await deps.waitlist.saveAssigned({ ...entry!, status: "atribuido" });
      }

      expect(anchorIds(await listOverbookings(deps))).not.toContain(ANCHOR);
      await expectOverbookingError(decideOverbooking(deps, ANCHOR, "aceitar"), "NO_CANDIDATES");
      await expect(deps.overbookings.list()).resolves.toEqual([]);
    });
  });

  describe("decideOverbooking", () => {
    it("aceite agenda o encaixe pendente no horário da âncora e atribui o candidato sugerido", async () => {
      const deps = setup();
      const suggestion = suggestionFor((await listOverbookings(deps)).suggestions, ANCHOR);

      const result = await acceptEncaixe(deps);

      const anchor = (await deps.appointments.getById(ANCHOR))!;
      expect(result.appointment).toMatchObject({
        patientId: suggestion.candidate.patientId,
        patientName: suggestion.candidate.patientName,
        specialty: "Neurologia",
        scheduledAt: anchor.scheduledAt,
        bookedAt: NOW,
        status: "pendente",
        preparation: null,
      });
      expect(await deps.appointments.getById(result.appointment.id)).toEqual(result.appointment);
      expect((await deps.waitlist.getById(suggestion.candidate.waitlistId))?.status).toBe("atribuido");
      expect(result.overbooking).toMatchObject({
        anchorAppointmentId: ANCHOR,
        decision: "aceita",
        sequence: 1,
        encaixeAppointmentId: result.appointment.id,
        riskProbability: suggestion.risk.probability,
        decidedAt: NOW,
      });

      const overview = await listOverbookings(deps);
      expect(anchorIds(overview)).not.toContain(ANCHOR);
      expect(overview.encaixeAppointmentIds).toEqual([result.appointment.id]);
    });

    it("um segundo aceite no mesmo bloco esbarra no limite", async () => {
      const deps = setup();
      await acceptEncaixe(deps);

      await expectOverbookingError(decideOverbooking(deps, ANCHOR, "aceitar"), "LIMIT_REACHED");
      expect(await deps.overbookings.list()).toHaveLength(MAX_OVERBOOKINGS_PER_BLOCK);
    });

    it("recusa esconde a sugestão e não mexe na agenda nem na fila", async () => {
      const deps = setup();
      const before = await deps.appointments.list();

      const result = await decideOverbooking(deps, ANCHOR, "recusar");

      expect(result).toMatchObject({
        decision: "recusar",
        overbooking: { decision: "recusada", sequence: null, encaixeAppointmentId: null },
      });
      expect(await deps.appointments.list()).toEqual(before);
      expect((await deps.waitlist.getById("wl-001"))?.status).toBe("aguardando");
      expect(anchorIds(await listOverbookings(deps))).not.toContain(ANCHOR);
      await expectOverbookingError(decideOverbooking(deps, ANCHOR, "aceitar"), "ALREADY_REFUSED");
    });

    it("recusa agendamento sem risco alto, inativo ou inexistente", async () => {
      const deps = setup();
      const risks = await scoreAppointmentsRisk(deps.appointments, deps.patients);
      const notHigh = risks.find((risk) => risk.band !== "alto");

      await expectOverbookingError(
        decideOverbooking(deps, notHigh!.appointmentId, "aceitar"),
        "NOT_HIGH_RISK",
      );
      await expectOverbookingError(decideOverbooking(deps, "apt-006", "recusar"), "ANCHOR_NOT_ACTIVE");
      await expect(decideOverbooking(deps, "apt-999", "aceitar")).rejects.toBeInstanceOf(
        AppointmentNotFoundError,
      );
    });

    it("não oferece o encaixe a quem tem oferta de vaga em aberto", async () => {
      const deps = setup();
      const first = suggestionFor((await listOverbookings(deps)).suggestions, ANCHOR).candidate
        .waitlistId;
      const second = first === "wl-001" ? "wl-004" : "wl-001";
      const anchor = (await deps.appointments.getById(ANCHOR))!;
      await deps.appointments.create({
        ...anchor,
        id: "apt-livre",
        scheduledAt: "2026-09-25T12:00:00.000Z",
        status: "liberado",
      });
      const offer = await startSlotOffer(deps, "apt-livre", 15);
      expect(offer.candidate.waitlistId).toBe(first);

      const result = await acceptEncaixe(deps);

      expect((await deps.waitlist.getById(second))?.status).toBe("atribuido");
      expect(result.appointment.patientId).not.toBe(offer.candidate.patientId);
    });
  });

  describe("convivência com o leilão", () => {
    it("depois do aceite, o NÃO da âncora libera só o encaixe: a vaga fica coberta e não abre leilão", async () => {
      const deps = setup();
      await acceptEncaixe(deps);
      await deps.appointments.confirm(ANCHOR, "NAO");

      await expect(listOverbookings(deps)).resolves.toMatchObject({
        coveredAppointmentIds: [ANCHOR],
      });
      await expectSlotOfferError(startSlotOffer(deps, ANCHOR, 15), "SLOT_COVERED_BY_OVERBOOKING");
      await expect(deps.offers.listRecent()).resolves.toEqual([]);
    });

    it("se o encaixe também cancela, a primeira vaga abre leilão e a segunda fica coberta pela oferta", async () => {
      const deps = setup();
      const { appointment: encaixe } = await acceptEncaixe(deps);
      await deps.appointments.confirm(ANCHOR, "NAO");
      await deps.appointments.confirm(encaixe.id, "NAO");

      await expect(listOverbookings(deps)).resolves.toMatchObject({ coveredAppointmentIds: [] });
      await startSlotOffer(deps, ANCHOR, 15);

      await expect(listOverbookings(deps)).resolves.toMatchObject({
        coveredAppointmentIds: [encaixe.id],
      });
      await expectSlotOfferError(startSlotOffer(deps, encaixe.id, 15), "SLOT_COVERED_BY_OVERBOOKING");
    });

    it("cascata em andamento para quando o bloco passa a ter encaixe", async () => {
      const deps = setup();
      const anchor = (await deps.appointments.getById(ANCHOR))!;
      await deps.appointments.create({ ...anchor, id: "apt-vaga", patientId: "pat-outro", status: "liberado" });
      const offer = await startSlotOffer(deps, "apt-vaga", 15);
      await acceptEncaixe(deps);

      const result = await respondSlotOffer(deps, offer.id, "recusar");

      expect(result).toMatchObject({ response: "recusar", nextOffer: null });
    });

    it("regressão: vaga liberada em bloco sem encaixe continua abrindo leilão", async () => {
      const deps = setup();
      await acceptEncaixe(deps);

      const offer = await startSlotOffer(deps, "apt-006", 15);

      expect(offer).toMatchObject({ appointmentId: "apt-006", status: "pendente" });
    });
  });
});
