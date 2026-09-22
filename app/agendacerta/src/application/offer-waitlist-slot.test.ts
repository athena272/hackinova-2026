import { beforeEach, describe, expect, it } from "vitest";
import { offerWaitlistSlot } from "@/application/offer-waitlist-slot";
import { OfferSlotError } from "@/domain/offer-slot";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import {
  InMemoryWaitlistRepository,
  resetWaitlistStoreForTests,
} from "@/repository/in-memory-waitlist-repository";
import { AppointmentNotFoundError } from "@/repository/errors";

describe("offerWaitlistSlot (memória)", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetWaitlistStoreForTests();
  });

  it("oferece vaga liberada a candidato da mesma especialidade", async () => {
    const appointments = new InMemoryAppointmentRepository();
    const waitlist = new InMemoryWaitlistRepository();

    // apt-006 já vem liberado (Endocrinologia) no seed
    const result = await offerWaitlistSlot(
      appointments,
      waitlist,
      "apt-006",
      "wl-002",
    );

    expect(result.appointment.status).toBe("pendente");
    expect(result.appointment.patientName).toBe("Igor Santos");
    expect(result.candidate.status).toBe("atribuido");

    const remaining = await waitlist.listBySpecialty("Endocrinologia");
    expect(remaining.some((item) => item.id === "wl-002")).toBe(false);
  });

  it("rejeita oferta em vaga pendente", async () => {
    const appointments = new InMemoryAppointmentRepository();
    const waitlist = new InMemoryWaitlistRepository();

    await expect(
      offerWaitlistSlot(appointments, waitlist, "apt-001", "wl-001"),
    ).rejects.toBeInstanceOf(OfferSlotError);
  });

  it("rejeita agendamento inexistente", async () => {
    const appointments = new InMemoryAppointmentRepository();
    const waitlist = new InMemoryWaitlistRepository();

    await expect(
      offerWaitlistSlot(appointments, waitlist, "apt-999", "wl-001"),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
  });
});
