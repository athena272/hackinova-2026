import { describe, expect, it } from "vitest";
import type { Appointment } from "./appointment";
import { offerSlot, OfferSlotError } from "./offer-slot";
import type { WaitlistEntry } from "./waitlist";

const baseAppointment: Appointment = {
  id: "apt-001",
  patientName: "Ana Souza",
  specialty: "Neurologia",
  scheduledAt: "2026-09-22T12:00:00.000Z",
  status: "liberado",
  phoneMasked: "(79) 9****-1234",
};

const baseCandidate: WaitlistEntry = {
  id: "wl-001",
  patientName: "Helena Dias",
  specialty: "Neurologia",
  phoneMasked: "(79) 9****-4444",
  status: "aguardando",
};

describe("offerSlot", () => {
  it("atribui candidato à vaga reaproveitável e deixa pendente para confirmar", () => {
    const result = offerSlot(baseAppointment, baseCandidate);

    expect(result.appointment).toEqual({
      ...baseAppointment,
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-4444",
      status: "pendente",
    });
    expect(result.candidate.status).toBe("atribuido");
  });

  it("aceita remarcacao_solicitada como vaga reaproveitável", () => {
    const result = offerSlot(
      { ...baseAppointment, status: "remarcacao_solicitada" },
      baseCandidate,
    );
    expect(result.appointment.status).toBe("pendente");
  });

  it("rejeita vaga que não é reaproveitável", () => {
    expect(() =>
      offerSlot({ ...baseAppointment, status: "pendente" }, baseCandidate),
    ).toThrow(OfferSlotError);

    try {
      offerSlot({ ...baseAppointment, status: "confirmado" }, baseCandidate);
    } catch (error) {
      expect(error).toBeInstanceOf(OfferSlotError);
      expect((error as OfferSlotError).code).toBe("SLOT_NOT_REUSABLE");
    }
  });

  it("rejeita candidato que não está aguardando", () => {
    expect(() =>
      offerSlot(baseAppointment, {
        ...baseCandidate,
        status: "atribuido",
      }),
    ).toThrow(/não está aguardando/);
  });

  it("rejeita especialidade diferente", () => {
    expect(() =>
      offerSlot(baseAppointment, {
        ...baseCandidate,
        specialty: "Oftalmologia",
      }),
    ).toThrow(OfferSlotError);

    try {
      offerSlot(baseAppointment, {
        ...baseCandidate,
        specialty: "Oftalmologia",
      });
    } catch (error) {
      expect((error as OfferSlotError).code).toBe("SPECIALTY_MISMATCH");
    }
  });
});
