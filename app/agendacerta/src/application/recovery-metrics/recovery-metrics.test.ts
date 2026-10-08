import { beforeEach, describe, expect, it } from "vitest";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { BEXIGA, JEJUM } from "@/domain/exam-preparation/exam-preparation.test-utils";
import { AVERAGE_PRICE_BRL } from "@/domain/recovery-metrics";
import { DEMO_WEEK, SEPTEMBER } from "@/domain/recovery-metrics/recovery-metrics.test-utils";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import {
  InMemoryDuplicateCheckRepository,
  resetDuplicateCheckStoreForTests,
} from "@/repository/in-memory-duplicate-check-repository";
import { InMemoryExamPreparationRepository } from "@/repository/in-memory-exam-preparation-repository";
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
import { answerPreparationChecklist } from "../answer-preparation-checklist";
import { chooseDuplicateBooking } from "../duplicate-bookings/choose-duplicate-booking";
import { sendDuplicateCheck } from "../duplicate-bookings/send-duplicate-check";
import { decideOverbooking } from "../overbooking/decide-overbooking";
import { releaseSlotForMissedPreparation } from "../release-slot-for-missed-preparation";
import { respondSlotOffer } from "../slot-offers/respond-slot-offer";
import { startSlotOffer } from "../slot-offers/start-slot-offer";
import { getRecoveryMetrics } from "./get-recovery-metrics";

/** Véspera da agenda da demo: todas as vagas do seed ainda vão acontecer. */
const NOW = "2026-09-21T12:00:00.000Z";

function setup(now = NOW) {
  let ids = 0;
  const appointments = new InMemoryAppointmentRepository();
  const deps = {
    appointments,
    waitlist: new InMemoryWaitlistRepository(),
    patients: new InMemoryPatientRepository(),
    offers: new InMemorySlotOfferRepository(),
    overbookings: new InMemoryOverbookingRepository(),
    duplicateChecks: new InMemoryDuplicateCheckRepository(),
    now: () => new Date(now),
    newOfferId: () => `offer-${++ids}`,
    newEncaixeId: () => `apt-enc-${++ids}`,
    newOverbookingId: () => `ovb-${++ids}`,
    newCheckId: () => `dup-${++ids}`,
    clinicNeighborhoodId: CLINIC_NEIGHBORHOOD_ID,
  };
  return deps;
}

type DemoDeps = ReturnType<typeof setup>;

async function acceptCascade(deps: DemoDeps, appointmentId: string) {
  const offer = await startSlotOffer(deps, appointmentId, 15);
  await respondSlotOffer(deps, offer.id, "aceitar");
}

/** Os quatro fluxos da demo do README, pelos mesmos casos de uso das rotas. */
async function runReadmeDemo(deps: DemoDeps) {
  await acceptCascade(deps, "apt-006");

  await decideOverbooking(deps, "apt-001", "aceitar");

  await answerPreparationChecklist(
    deps.appointments,
    new InMemoryExamPreparationRepository(),
    "apt-008",
    { [JEJUM]: true, [BEXIGA]: false },
    deps.now,
  );
  await releaseSlotForMissedPreparation(deps.appointments, "apt-008");
  await acceptCascade(deps, "apt-008");

  const check = await sendDuplicateCheck(deps, ["apt-002", "apt-009"]);
  await chooseDuplicateBooking(deps, check.id, "apt-002");
  await acceptCascade(deps, "apt-009");
}

describe("getRecoveryMetrics com o seed da demo", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetWaitlistStoreForTests();
    resetSlotOfferStoreForTests();
    resetOverbookingStoreForTests();
    resetDuplicateCheckStoreForTests();
  });

  it("seed sem nenhum fluxo: setembro com 50% de faltas e nenhuma vaga recuperada", async () => {
    const metrics = await getRecoveryMetrics(setup(), { kind: "mes", referenceDate: "2026-09-24" });

    expect(metrics.period).toEqual(SEPTEMBER);
    expect(metrics.noShow).toEqual({ noShows: 2, attended: 2, rate: 0.5 });
    expect(metrics.recovered.total).toBe(0);
    expect(metrics.estimatedValue).toBe(0);
    expect(metrics.hasData).toBe(true);
  });

  it("semana da agenda sem fluxo executado ainda não tem dados", async () => {
    const metrics = await getRecoveryMetrics(setup(), { kind: "semana", referenceDate: "2026-09-24" });

    expect(metrics.period).toEqual(DEMO_WEEK);
    expect(metrics.hasData).toBe(false);
    expect(metrics.noShow.rate).toBeNull();
  });

  it("sem data de referência, usa o período de hoje no fuso da clínica", async () => {
    // 21/09 às 0h30 em UTC ainda é domingo 20/09 em Aracaju.
    const metrics = await getRecoveryMetrics(setup("2026-09-21T00:30:00.000Z"), { kind: "semana" });

    expect(metrics.period).toEqual({ kind: "semana", start: "2026-09-14", end: "2026-09-20" });
  });

  it("depois da demo: 4 vagas na semana, uma por origem, R$ 750 e 4 pacientes da lista atendidos", async () => {
    const deps = setup();
    await runReadmeDemo(deps);

    const week = await getRecoveryMetrics(deps, { kind: "semana", referenceDate: "2026-09-24" });

    expect(week.recovered).toEqual({
      total: 4,
      byOrigin: { leilao: 1, preparo: 1, booking_duplo: 1, overbooking: 1 },
    });
    expect(week.estimatedValue).toBe(3 * AVERAGE_PRICE_BRL.consulta + AVERAGE_PRICE_BRL.exame);
    expect(week.estimatedValue).toBe(750);
    expect(week.waitlistPatientsServed).toBe(4);

    const month = await getRecoveryMetrics(deps, { kind: "mes", referenceDate: "2026-09-24" });
    expect(month.recovered.total).toBe(4);
    expect(month.noShow.rate).toBe(0.5);

    const nextWeek = await getRecoveryMetrics(deps, { kind: "semana", referenceDate: "2026-09-28" });
    expect(nextWeek.recovered.total).toBe(0);
  });
});
