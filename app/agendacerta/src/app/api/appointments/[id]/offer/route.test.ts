import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfferSlotError } from "@/domain/offer-slot";
import {
  AppointmentNotFoundError,
  WaitlistNotFoundError,
} from "@/repository/errors";

vi.mock("@/application/offer-waitlist-slot", () => ({
  offerWaitlistSlot: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(() => ({})),
}));

vi.mock("@/repository/create-waitlist-repository", () => ({
  createWaitlistRepository: vi.fn(() => ({})),
}));

import { offerWaitlistSlot } from "@/application/offer-waitlist-slot";
import { POST } from "./route";

describe("POST /api/appointments/[id]/offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("oferece vaga e devolve appointment + candidate", async () => {
    vi.mocked(offerWaitlistSlot).mockResolvedValue({
      appointment: {
        id: "apt-006",
        patientName: "Igor Santos",
        specialty: "Endocrinologia",
        scheduledAt: "2026-09-23T18:45:00.000Z",
        status: "pendente",
        phoneMasked: "(79) 9****-5555",
      },
      candidate: {
        id: "wl-002",
        patientName: "Igor Santos",
        specialty: "Endocrinologia",
        phoneMasked: "(79) 9****-5555",
        status: "atribuido",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/appointments/apt-006/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId: "wl-002" }),
      }),
      { params: Promise.resolve({ id: "apt-006" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.appointment.status).toBe("pendente");
    expect(body.candidate.id).toBe("wl-002");
  });

  it("retorna 400 quando a vaga não é reaproveitável", async () => {
    vi.mocked(offerWaitlistSlot).mockRejectedValue(
      new OfferSlotError(
        "SLOT_NOT_REUSABLE",
        'Não é possível oferecer uma vaga com status "pendente".',
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/apt-001/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId: "wl-001" }),
      }),
      { params: Promise.resolve({ id: "apt-001" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Não é possível oferecer uma vaga com status "pendente".',
      code: "SLOT_NOT_REUSABLE",
    });
  });

  it("retorna 404 quando o candidato não existe", async () => {
    vi.mocked(offerWaitlistSlot).mockRejectedValue(
      new WaitlistNotFoundError("wl-999"),
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/apt-006/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId: "wl-999" }),
      }),
      { params: Promise.resolve({ id: "apt-006" }) },
    );

    expect(response.status).toBe(404);
  });

  it("retorna 404 quando o agendamento não existe", async () => {
    vi.mocked(offerWaitlistSlot).mockRejectedValue(
      new AppointmentNotFoundError("apt-999"),
    );

    const response = await POST(
      new Request("http://localhost/api/appointments/apt-999/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waitlistId: "wl-001" }),
      }),
      { params: Promise.resolve({ id: "apt-999" }) },
    );

    expect(response.status).toBe(404);
  });
});
