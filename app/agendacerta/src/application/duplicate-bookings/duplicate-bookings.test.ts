import { beforeEach, describe, expect, it } from "vitest";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { DuplicateBookingError } from "@/domain/duplicate-booking";
import { DuplicateCheckNotFoundError } from "@/repository/errors";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import {
  InMemoryDuplicateCheckRepository,
  resetDuplicateCheckStoreForTests,
} from "@/repository/in-memory-duplicate-check-repository";
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
import type { OverbookingDeps } from "../overbooking/deps";
import { listOverbookings } from "../overbooking/list-overbookings";
import type { SlotOfferDeps } from "../slot-offers/deps";
import { startSlotOffer } from "../slot-offers/start-slot-offer";
import { chooseDuplicateBooking } from "./choose-duplicate-booking";
import type { DuplicateBookingDeps } from "./deps";
import { listDuplicateBookings } from "./list-duplicate-bookings";
import { sendDuplicateCheck } from "./send-duplicate-check";

/** Seed real: Bruno Lima marcou Endocrinologia na Unidade Jardins (apt-002) e na Unidade Centro (apt-009). */
const BRUNO_PAIR = ["apt-002", "apt-009"];
const NOW = "2026-09-21T12:00:00.000Z";

function setup() {
  let ids = 0;
  const appointments = new InMemoryAppointmentRepository();
  const deps: DuplicateBookingDeps & SlotOfferDeps & OverbookingDeps = {
    appointments,
    duplicateChecks: new InMemoryDuplicateCheckRepository(appointments),
    waitlist: new InMemoryWaitlistRepository(),
    patients: new InMemoryPatientRepository(),
    offers: new InMemorySlotOfferRepository(),
    overbookings: new InMemoryOverbookingRepository(),
    now: () => new Date(NOW),
    newCheckId: () => `dup-${++ids}`,
    newOfferId: () => `offer-${++ids}`,
    newEncaixeId: () => `apt-enc-${++ids}`,
    newOverbookingId: () => `ovb-${++ids}`,
    clinicNeighborhoodId: CLINIC_NEIGHBORHOOD_ID,
  };
  return deps;
}

async function expectDuplicateError(promise: Promise<unknown>, code: DuplicateBookingError["code"]) {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(DuplicateBookingError);
  expect((error as DuplicateBookingError).code).toBe(code);
}

describe("casos de uso da detecção de booking duplo", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetDuplicateCheckStoreForTests();
    resetWaitlistStoreForTests();
    resetSlotOfferStoreForTests();
    resetOverbookingStoreForTests();
  });

  describe("listDuplicateBookings", () => {
    it("detecta o par do Bruno em duas unidades e não sinaliza o retorno do Diego", async () => {
      const overview = await listDuplicateBookings(setup());

      expect(overview.alerts).toHaveLength(1);
      expect(overview.alerts[0]).toMatchObject({
        patientName: "Bruno Lima",
        specialty: "Endocrinologia",
        check: null,
      });
      expect(overview.alerts[0].appointments.map((item) => [item.id, item.unit?.name])).toEqual([
        ["apt-002", "Unidade Jardins"],
        ["apt-009", "Unidade Centro"],
      ]);
      expect(overview.flaggedAppointmentIds).toEqual(BRUNO_PAIR);
      expect(overview.flaggedAppointmentIds).not.toContain("apt-010");
      expect(overview.flaggedAppointmentIds).not.toContain("apt-011");
      expect(overview.releasedAppointmentIds).toEqual([]);
    });

    it("os horários novos do seed não mudam as sugestões de encaixe", async () => {
      const anchors = (await listOverbookings(setup())).suggestions.map((item) => item.anchor.id);

      expect(anchors).toHaveLength(3);
      for (const id of [...BRUNO_PAIR, "apt-010", "apt-011"]) {
        expect(anchors).not.toContain(id);
      }
    });
  });

  describe("sendDuplicateCheck", () => {
    it("registra a confirmação aguardando e o painel passa a mostrá-la no alerta", async () => {
      const deps = setup();

      const check = await sendDuplicateCheck(deps, ["apt-009", "apt-002"]);

      expect(check).toEqual({
        id: "dup-1",
        patientId: "pat-6b7f76f9c9ca",
        groupKey: "apt-002,apt-009",
        appointmentIds: BRUNO_PAIR,
        status: "aguardando",
        sentAt: NOW,
        keptAppointmentId: null,
        resolvedAt: null,
      });
      const [alert] = (await listDuplicateBookings(deps)).alerts;
      expect(alert.check).toEqual({ id: "dup-1", sentAt: NOW, appointmentIds: BRUNO_PAIR });
    });

    it("recusa horários que não formam um grupo detectado, como o retorno do Diego", async () => {
      const deps = setup();

      await expectDuplicateError(sendDuplicateCheck(deps, ["apt-010", "apt-011"]), "NOT_A_DUPLICATE_GROUP");
      await expectDuplicateError(sendDuplicateCheck(deps, ["apt-002"]), "NOT_A_DUPLICATE_GROUP");
      await expect(deps.duplicateChecks.list()).resolves.toEqual([]);
    });

    it("não envia duas vezes para o mesmo grupo", async () => {
      const deps = setup();
      await sendDuplicateCheck(deps, BRUNO_PAIR);

      await expectDuplicateError(sendDuplicateCheck(deps, BRUNO_PAIR), "ALREADY_SENT");
      await expect(deps.duplicateChecks.list()).resolves.toHaveLength(1);
    });
  });

  describe("chooseDuplicateBooking", () => {
    it("confirma o horário mantido, libera o outro e tira o alerta do painel", async () => {
      const deps = setup();
      const check = await sendDuplicateCheck(deps, BRUNO_PAIR);

      const result = await chooseDuplicateBooking(deps, check.id, "apt-002");

      expect(result.check).toMatchObject({ status: "resolvida", keptAppointmentId: "apt-002", resolvedAt: NOW });
      expect(result.kept).toMatchObject({ id: "apt-002", status: "confirmado" });
      expect(result.released.map(({ id, status }) => [id, status])).toEqual([["apt-009", "liberado"]]);
      await expect(deps.appointments.getById("apt-002")).resolves.toMatchObject({ status: "confirmado" });
      await expect(deps.appointments.getById("apt-009")).resolves.toMatchObject({ status: "liberado" });
      await expect(listDuplicateBookings(deps)).resolves.toEqual({
        alerts: [],
        flaggedAppointmentIds: [],
        releasedAppointmentIds: ["apt-009"],
      });
    });

    it("o horário descartado entra na oferta em cascata da lista de espera", async () => {
      const deps = setup();
      const check = await sendDuplicateCheck(deps, BRUNO_PAIR);
      await chooseDuplicateBooking(deps, check.id, "apt-002");

      const offer = await startSlotOffer(deps, "apt-009", 15);

      expect(offer).toMatchObject({ appointmentId: "apt-009", status: "pendente" });
    });

    it("recusa confirmação inexistente e escolha fora do grupo", async () => {
      const deps = setup();
      const check = await sendDuplicateCheck(deps, BRUNO_PAIR);

      await expect(chooseDuplicateBooking(deps, "dup-x", "apt-002")).rejects.toBeInstanceOf(
        DuplicateCheckNotFoundError,
      );
      await expectDuplicateError(chooseDuplicateBooking(deps, check.id, "apt-010"), "APPOINTMENT_NOT_IN_CHECK");
    });

    it("recusa responder duas vezes", async () => {
      const deps = setup();
      const check = await sendDuplicateCheck(deps, BRUNO_PAIR);
      await chooseDuplicateBooking(deps, check.id, "apt-002");

      await expectDuplicateError(chooseDuplicateBooking(deps, check.id, "apt-009"), "CHECK_NOT_OPEN");
    });

    it("o grupo se desfaz quando o paciente já cancelou um dos horários pela confirmação comum", async () => {
      const deps = setup();
      const check = await sendDuplicateCheck(deps, BRUNO_PAIR);
      await deps.appointments.confirm("apt-009", "NAO");

      await expectDuplicateError(chooseDuplicateBooking(deps, check.id, "apt-002"), "GROUP_DISSOLVED");
      await expect(listDuplicateBookings(deps)).resolves.toMatchObject({ alerts: [] });
      await expect(deps.duplicateChecks.getById(check.id)).resolves.toMatchObject({ status: "aguardando" });
    });
  });
});
