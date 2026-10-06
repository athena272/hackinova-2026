import { describe, expect, it } from "vitest";
import type { Appointment } from "./appointment";
import { offerSlot, OfferSlotError } from "./offer-slot";
import type { WaitlistEntry } from "./waitlist";

const OFFERED_AT = "2026-09-20T15:00:00.000Z";

const baseAppointment: Appointment = {
  id: "apt-001",
  patientId: "pat-ana",
  patientName: "Ana Souza",
  specialty: "Neurologia",
  scheduledAt: "2026-09-22T12:00:00.000Z",
  bookedAt: "2026-08-13T12:00:00.000Z",
  status: "liberado",
  phoneMasked: "(79) 9****-1234",
  procedure: { type: "consulta" },
};

const baseCandidate: WaitlistEntry = {
  id: "wl-001",
  patientId: "pat-helena",
  patientName: "Helena Dias",
  specialty: "Neurologia",
  phoneMasked: "(79) 9****-4444",
  status: "aguardando",
};

describe("offerSlot", () => {
  it("atribui candidato à vaga reaproveitável e deixa pendente para confirmar", () => {
    const result = offerSlot(baseAppointment, baseCandidate, OFFERED_AT);

    expect(result.appointment).toEqual({
      ...baseAppointment,
      patientId: "pat-helena",
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-4444",
      bookedAt: OFFERED_AT,
      status: "pendente",
    });
    expect(result.candidate.status).toBe("atribuido");
  });

  it("conta a oferta como marcação nova, sem herdar a antecedência do paciente anterior", () => {
    const result = offerSlot(baseAppointment, baseCandidate, OFFERED_AT);

    expect(result.appointment.bookedAt).toBe(OFFERED_AT);
    expect(result.appointment.bookedAt).not.toBe(baseAppointment.bookedAt);
  });

  it("oferta depois do horário conta como marcada no próprio horário (banco exige booked_at <= scheduled_at)", () => {
    const result = offerSlot(
      baseAppointment,
      baseCandidate,
      "2026-10-06T16:00:00.000Z",
    );

    expect(result.appointment.bookedAt).toBe(baseAppointment.scheduledAt);
  });

  it("mantém o procedimento da vaga ao trocar o paciente", () => {
    const exam = {
      ...baseAppointment,
      procedure: { type: "exame", examName: "Glicemia em jejum" } as const,
    };

    const result = offerSlot(exam, baseCandidate, OFFERED_AT);

    expect(result.appointment.procedure).toEqual(exam.procedure);
    expect(result.appointment.patientId).toBe("pat-helena");
  });

  it("aceita remarcacao_solicitada como vaga reaproveitável", () => {
    const result = offerSlot(
      { ...baseAppointment, status: "remarcacao_solicitada" },
      baseCandidate,
      OFFERED_AT,
    );
    expect(result.appointment.status).toBe("pendente");
  });

  it("rejeita vaga que não é reaproveitável", () => {
    expect(() =>
      offerSlot({ ...baseAppointment, status: "pendente" }, baseCandidate, OFFERED_AT),
    ).toThrow(OfferSlotError);

    try {
      offerSlot({ ...baseAppointment, status: "confirmado" }, baseCandidate, OFFERED_AT);
    } catch (error) {
      expect(error).toBeInstanceOf(OfferSlotError);
      expect((error as OfferSlotError).code).toBe("SLOT_NOT_REUSABLE");
    }
  });

  it("rejeita candidato que não está aguardando", () => {
    expect(() =>
      offerSlot(
        baseAppointment,
        { ...baseCandidate, status: "atribuido" },
        OFFERED_AT,
      ),
    ).toThrow(/não está aguardando/);
  });

  it("rejeita especialidade diferente", () => {
    expect(() =>
      offerSlot(
        baseAppointment,
        { ...baseCandidate, specialty: "Oftalmologia" },
        OFFERED_AT,
      ),
    ).toThrow(OfferSlotError);

    try {
      offerSlot(
        baseAppointment,
        { ...baseCandidate, specialty: "Oftalmologia" },
        OFFERED_AT,
      );
    } catch (error) {
      expect((error as OfferSlotError).code).toBe("SPECIALTY_MISMATCH");
    }
  });
});
