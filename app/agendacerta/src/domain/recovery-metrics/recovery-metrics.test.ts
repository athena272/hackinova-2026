import { describe, expect, it } from "vitest";
import { accepted, refused } from "../overbooking/overbooking.test-utils";
import { pendingOffer, slotAppointment } from "../slot-offer/slot-offer.test-utils";
import {
  AVERAGE_PRICE_BRL,
  clinicToday,
  collectRecoveredSlots,
  computeRecoveryMetrics,
  isInPeriod,
  isMetricsPeriodKind,
  parseReferenceDate,
  periodContaining,
  shiftPeriod,
  switchPeriodKind,
} from ".";
import { DEMO_WEEK, SEPTEMBER, recoveredSlot } from "./recovery-metrics.test-utils";

describe("período dos indicadores", () => {
  it("semana vai de segunda a domingo, qualquer que seja o dia de referência", () => {
    expect(periodContaining("semana", "2026-09-21")).toEqual(DEMO_WEEK);
    expect(periodContaining("semana", "2026-09-24")).toEqual(DEMO_WEEK);
    expect(periodContaining("semana", "2026-09-27")).toEqual(DEMO_WEEK);
  });

  it("mês vai do dia 1 ao último dia, inclusive fevereiro", () => {
    expect(periodContaining("mes", "2026-09-15")).toEqual(SEPTEMBER);
    expect(periodContaining("mes", "2028-02-10")).toEqual({ kind: "mes", start: "2028-02-01", end: "2028-02-29" });
  });

  it("anda para o período anterior e o próximo, atravessando a virada do ano", () => {
    expect(shiftPeriod(DEMO_WEEK, 1)).toEqual({ kind: "semana", start: "2026-09-28", end: "2026-10-04" });
    expect(shiftPeriod(DEMO_WEEK, -1)).toEqual({ kind: "semana", start: "2026-09-14", end: "2026-09-20" });
    expect(shiftPeriod(periodContaining("semana", "2026-12-31"), 1)).toEqual({
      kind: "semana",
      start: "2027-01-04",
      end: "2027-01-10",
    });
    expect(shiftPeriod(periodContaining("mes", "2026-12-05"), 1)).toEqual({
      kind: "mes",
      start: "2027-01-01",
      end: "2027-01-31",
    });
    expect(shiftPeriod(periodContaining("mes", "2027-01-20"), -1)).toEqual({
      kind: "mes",
      start: "2026-12-01",
      end: "2026-12-31",
    });
  });

  it("horário perto da meia-noite UTC cai no dia local da clínica", () => {
    // 27/09 às 23h30 em Aracaju já é 28/09 em UTC.
    expect(isInPeriod("2026-09-28T02:30:00.000Z", DEMO_WEEK)).toBe(true);
    // 21/09 às 0h em UTC ainda é domingo 20/09 em Aracaju.
    expect(isInPeriod("2026-09-21T00:00:00.000Z", DEMO_WEEK)).toBe(false);
  });

  it("hoje é a data da clínica, não a data UTC do servidor", () => {
    expect(clinicToday(new Date("2026-10-08T01:00:00.000Z"))).toBe("2026-10-07");
  });

  it("ao trocar semana por mês, vai para o período de hoje se ele estava na tela", () => {
    expect(switchPeriodKind(DEMO_WEEK, "mes", "2026-09-24")).toEqual(SEPTEMBER);
    expect(switchPeriodKind(SEPTEMBER, "semana", "2026-09-24")).toEqual(DEMO_WEEK);
  });

  it("ao trocar um período passado, usa o início dele e não volta para hoje", () => {
    expect(switchPeriodKind(SEPTEMBER, "semana", "2026-10-07")).toEqual({
      kind: "semana",
      start: "2026-08-31",
      end: "2026-09-06",
    });
    expect(switchPeriodKind(DEMO_WEEK, "semana", "2026-10-07")).toBe(DEMO_WEEK);
  });

  it("valida a data de referência e o tipo de período", () => {
    expect(parseReferenceDate("2026-09-24")).toBe("2026-09-24");
    expect(parseReferenceDate("2026-02-30")).toBeNull();
    expect(parseReferenceDate("24/09/2026")).toBeNull();
    expect(parseReferenceDate("2026-9-4")).toBeNull();
    expect(() => periodContaining("semana", "ontem")).toThrow(RangeError);
    expect(isMetricsPeriodKind("semana")).toBe(true);
    expect(isMetricsPeriodKind("ano")).toBe(false);
    expect(isMetricsPeriodKind(undefined)).toBe(false);
  });
});

describe("collectRecoveredSlots", () => {
  const slot = slotAppointment();
  const exam = slotAppointment({
    id: "apt-008",
    scheduledAt: "2026-09-24T09:00:00-03:00",
    procedure: { type: "exame", examName: "Ultrassonografia de abdome total" },
  });
  const encaixe = slotAppointment({ id: "apt-enc-1", patientId: "pat-helena" });

  it("o motivo da liberação vira a origem, com horário e procedimento da vaga", () => {
    const slots = collectRecoveredSlots({
      acceptedOffers: [
        pendingOffer({ status: "aceita", releaseReason: "cancelamento" }),
        pendingOffer({ id: "offer-2", appointmentId: "apt-008", status: "aceita", releaseReason: "preparo" }),
        pendingOffer({ id: "offer-3", status: "aceita", releaseReason: "booking_duplo" }),
      ],
      overbookings: [],
      appointments: [slot, exam],
    });

    expect(slots).toEqual([
      { origin: "leilao", appointmentId: "apt-006", scheduledAt: slot.scheduledAt, procedureType: "consulta", patientId: "pat-igor" },
      { origin: "preparo", appointmentId: "apt-008", scheduledAt: exam.scheduledAt, procedureType: "exame", patientId: "pat-igor" },
      { origin: "booking_duplo", appointmentId: "apt-006", scheduledAt: slot.scheduledAt, procedureType: "consulta", patientId: "pat-igor" },
    ]);
  });

  it("encaixe aceito conta como overbooking no horário do bloco; recusa não conta", () => {
    const slots = collectRecoveredSlots({
      acceptedOffers: [],
      overbookings: [accepted({ encaixeAppointmentId: "apt-enc-1" }), refused()],
      appointments: [encaixe],
    });

    expect(slots).toEqual([
      {
        origin: "overbooking",
        appointmentId: "apt-enc-1",
        scheduledAt: accepted().scheduledAt,
        procedureType: "consulta",
        patientId: "pat-helena",
      },
    ]);
  });

  it("ignora oferta ainda aberta e registro sem agendamento correspondente", () => {
    expect(
      collectRecoveredSlots({
        acceptedOffers: [pendingOffer(), pendingOffer({ id: "offer-9", appointmentId: "apt-999", status: "aceita" })],
        overbookings: [accepted({ encaixeAppointmentId: "apt-999" })],
        appointments: [slot],
      }),
    ).toEqual([]);
  });
});

describe("computeRecoveryMetrics", () => {
  const outcome = (id: string, status: "compareceu" | "faltou", scheduledAt: string) =>
    slotAppointment({ id, status, scheduledAt });

  it("conta cada origem no lugar certo e soma o valor por consulta e exame", () => {
    const metrics = computeRecoveryMetrics({
      recoveredSlots: [
        recoveredSlot(),
        recoveredSlot({ origin: "preparo", appointmentId: "apt-008", procedureType: "exame", patientId: "pat-nelson" }),
        recoveredSlot({ origin: "booking_duplo", appointmentId: "apt-009", patientId: "pat-lucas" }),
        recoveredSlot({ origin: "overbooking", appointmentId: "apt-enc-1", patientId: "pat-helena" }),
      ],
      appointments: [],
      period: DEMO_WEEK,
    });

    expect(metrics.recovered).toEqual({
      total: 4,
      byOrigin: { leilao: 1, preparo: 1, booking_duplo: 1, overbooking: 1 },
    });
    expect(metrics.estimatedValue).toBe(3 * AVERAGE_PRICE_BRL.consulta + AVERAGE_PRICE_BRL.exame);
    expect(metrics.waitlistPatientsServed).toBe(4);
    expect(metrics.prices).toBe(AVERAGE_PRICE_BRL);
    expect(metrics.hasData).toBe(true);
  });

  it("deixa de fora recuperações de outro período e usa os preços informados", () => {
    const metrics = computeRecoveryMetrics({
      recoveredSlots: [recoveredSlot(), recoveredSlot({ scheduledAt: "2026-09-29T14:00:00-03:00" })],
      appointments: [],
      period: DEMO_WEEK,
      prices: { consulta: 90, exame: 60 },
    });

    expect(metrics.recovered.total).toBe(1);
    expect(metrics.estimatedValue).toBe(90);
  });

  it("paciente que ficou com duas vagas conta uma vez na lista de espera", () => {
    const metrics = computeRecoveryMetrics({
      recoveredSlots: [recoveredSlot(), recoveredSlot({ appointmentId: "apt-009" })],
      appointments: [],
      period: DEMO_WEEK,
    });

    expect(metrics.recovered.total).toBe(2);
    expect(metrics.waitlistPatientsServed).toBe(1);
  });

  it("taxa de faltas usa só consultas encerradas do período", () => {
    const metrics = computeRecoveryMetrics({
      recoveredSlots: [],
      appointments: [
        outcome("hist-019", "faltou", "2026-09-02T10:00:00-03:00"),
        outcome("hist-013", "compareceu", "2026-09-04T11:30:00-03:00"),
        outcome("hist-030", "compareceu", "2026-09-09T10:30:00-03:00"),
        outcome("hist-028", "faltou", "2026-09-14T15:30:00-03:00"),
        outcome("hist-022", "compareceu", "2026-08-31T08:00:00-03:00"),
        slotAppointment({ id: "apt-001", status: "pendente", scheduledAt: "2026-09-22T09:00:00-03:00" }),
      ],
      period: SEPTEMBER,
    });

    expect(metrics.noShow).toEqual({ noShows: 2, attended: 2, rate: 0.5 });
    expect(metrics.recovered.total).toBe(0);
    expect(metrics.hasData).toBe(true);
  });

  it("período sem dados fica zerado, com taxa null e sem dados", () => {
    const metrics = computeRecoveryMetrics({
      recoveredSlots: [],
      appointments: [slotAppointment({ status: "pendente" })],
      period: DEMO_WEEK,
    });

    expect(metrics).toEqual({
      period: DEMO_WEEK,
      recovered: { total: 0, byOrigin: { leilao: 0, preparo: 0, booking_duplo: 0, overbooking: 0 } },
      waitlistPatientsServed: 0,
      noShow: { noShows: 0, attended: 0, rate: null },
      estimatedValue: 0,
      prices: AVERAGE_PRICE_BRL,
      hasData: false,
    });
  });
});
