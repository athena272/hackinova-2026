import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreparationError } from "@/domain/exam-preparation";
import { examAppointment } from "@/domain/exam-preparation/exam-preparation.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import { AppointmentNotFoundError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/release-slot-for-missed-preparation", () => ({
  releaseSlotForMissedPreparation: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(() => ({ kind: "appointments" })),
}));

import { releaseSlotForMissedPreparation } from "@/application/release-slot-for-missed-preparation";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

const RELEASED = examAppointment({
  status: "liberado",
  preparation: {
    result: "nao_cumprido",
    missedItemIds: ["prep-us-abdome-total-jejum"],
    answeredAt: "2026-10-18T15:00:00.000Z",
  },
});

function release(id: string) {
  return POST(
    new Request(`http://localhost/api/appointments/${id}/release`, { method: "POST" }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/appointments/[id]/release", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não libera nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await release("apt-008");

    expect(response.status).toBe(401);
    expect(releaseSlotForMissedPreparation).not.toHaveBeenCalled();
  });

  it("libera a vaga com o repositório da fábrica", async () => {
    vi.mocked(releaseSlotForMissedPreparation).mockResolvedValue(RELEASED);

    const response = await release("apt-008");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ appointment: RELEASED });
    expect(releaseSlotForMissedPreparation).toHaveBeenCalledWith(
      { kind: "appointments" },
      "apt-008",
    );
  });

  it("responde 404 quando o agendamento não existe", async () => {
    vi.mocked(releaseSlotForMissedPreparation).mockRejectedValue(
      new AppointmentNotFoundError("apt-999"),
    );

    expect((await release("apt-999")).status).toBe(404);
  });

  it("responde 400 com code quando o preparo não foi marcado como não cumprido", async () => {
    vi.mocked(releaseSlotForMissedPreparation).mockRejectedValue(
      new PreparationError("PREPARATION_NOT_MISSED", "Preparo não marcado como não cumprido."),
    );

    const response = await release("apt-007");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "PREPARATION_NOT_MISSED" });
  });

  it("responde 500 sem expor detalhes em falha inesperada", async () => {
    vi.mocked(releaseSlotForMissedPreparation).mockRejectedValue(new Error("timeout"));

    const response = await release("apt-008");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno ao liberar vaga." });
  });
});
