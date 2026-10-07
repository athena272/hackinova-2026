import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/domain/appointment";
import { ConfirmationError } from "@/domain/confirmation";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentNotFoundError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@/repository/create-appointment-repository")
  >()),
  createAppointmentRepository: vi.fn(),
}));

import { requireClinicSession } from "@/lib/auth/require-session";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { POST } from "./route";

const CONFIRMED: Appointment = {
  id: "apt-001",
  patientId: "pat-6f020c3c9b97",
  patientName: "Ana Souza",
  specialty: "Neurologia",
  scheduledAt: "2026-09-22T12:00:00.000Z",
  bookedAt: "2026-08-13T12:00:00.000Z",
  status: "confirmado",
  phoneMasked: "(79) 9****-1234",
  procedure: { type: "consulta" },
  preparation: null,
  unit: null,
  returnOfAppointmentId: null,
};

function mockRepo(confirm: AppointmentRepository["confirm"]): AppointmentRepository {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    confirm,
    saveOffered: vi.fn(),
    savePreparationAnswer: vi.fn(),
    saveReleased: vi.fn(),
  };
}

function confirmRequest(id: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/appointments/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/appointments/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não altera o agendamento", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await confirmRequest("apt-001", { action: "SIM" });

    expect(response.status).toBe(401);
    expect(createAppointmentRepository).not.toHaveBeenCalled();
  });

  it("confirma o agendamento com sessão válida", async () => {
    const confirm = vi.fn().mockResolvedValue(CONFIRMED);
    vi.mocked(createAppointmentRepository).mockReturnValue(mockRepo(confirm));

    const response = await confirmRequest("apt-001", { action: "SIM" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ appointment: CONFIRMED });
    expect(confirm).toHaveBeenCalledWith("apt-001", "SIM");
  });

  it("retorna 400 para ação inválida", async () => {
    const response = await confirmRequest("apt-001", { action: "TALVEZ" });

    expect(response.status).toBe(400);
  });

  it("retorna 404 quando o agendamento não existe", async () => {
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo(vi.fn().mockRejectedValue(new AppointmentNotFoundError("apt-999"))),
    );

    const response = await confirmRequest("apt-999", { action: "SIM" });

    expect(response.status).toBe(404);
  });

  it("retorna 400 com code quando a vaga não está pendente", async () => {
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo(
        vi
          .fn()
          .mockRejectedValue(
            new ConfirmationError(
              "NOT_PENDING",
              'Não é possível confirmar uma vaga com status "confirmado".',
            ),
          ),
      ),
    );

    const response = await confirmRequest("apt-001", { action: "SIM" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "NOT_PENDING" });
  });
});
