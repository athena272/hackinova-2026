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

vi.mock("@/application/answer-preparation-checklist", () => ({
  answerPreparationChecklist: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(() => ({ kind: "appointments" })),
}));

vi.mock("@/repository/create-exam-preparation-repository", () => ({
  createExamPreparationRepository: vi.fn(() => ({ kind: "preparations" })),
}));

import { answerPreparationChecklist } from "@/application/answer-preparation-checklist";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

const ANSWERED = examAppointment({
  preparation: {
    result: "nao_cumprido",
    missedItemIds: ["prep-us-abdome-total-bexiga"],
    answeredAt: "2026-10-18T15:00:00.000Z",
  },
});

function postRaw(id: string, body: string) {
  return POST(
    new Request(`http://localhost/api/appointments/${id}/preparation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }),
    { params: Promise.resolve({ id }) },
  );
}

const post = (id: string, body: unknown) => postRaw(id, JSON.stringify(body));

describe("POST /api/appointments/[id]/preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não grava nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await post("apt-008", { answers: {} });

    expect(response.status).toBe(401);
    expect(answerPreparationChecklist).not.toHaveBeenCalled();
  });

  it("registra as respostas com os repositórios da fábrica", async () => {
    vi.mocked(answerPreparationChecklist).mockResolvedValue(ANSWERED);
    const answers = { "prep-us-abdome-total-jejum": true, "prep-us-abdome-total-bexiga": false };

    const response = await post("apt-008", { answers });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ appointment: ANSWERED });
    expect(answerPreparationChecklist).toHaveBeenCalledWith(
      { kind: "appointments" },
      { kind: "preparations" },
      "apt-008",
      answers,
    );
  });

  it("responde 400 para JSON inválido", async () => {
    const response = await postRaw("apt-008", "{");

    expect(response.status).toBe(400);
    expect(answerPreparationChecklist).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ answers: null }], [{ answers: [true, false] }], [{ answers: "sim" }]])(
    "responde 400 quando answers não é um objeto (%j)",
    async (body) => {
      const response = await post("apt-008", body);

      expect(response.status).toBe(400);
      expect(answerPreparationChecklist).not.toHaveBeenCalled();
    },
  );

  it("responde 404 quando o agendamento não existe", async () => {
    vi.mocked(answerPreparationChecklist).mockRejectedValue(
      new AppointmentNotFoundError("apt-999"),
    );

    const response = await post("apt-999", { answers: {} });

    expect(response.status).toBe(404);
  });

  it("responde 400 com code quando o domínio recusa", async () => {
    vi.mocked(answerPreparationChecklist).mockRejectedValue(
      new PreparationError("ALREADY_ANSWERED", "Checklist já respondido."),
    );

    const response = await post("apt-004", { answers: {} });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Checklist já respondido.",
      code: "ALREADY_ANSWERED",
    });
  });

  it("responde 500 sem expor detalhes em falha inesperada", async () => {
    vi.mocked(answerPreparationChecklist).mockRejectedValue(new Error("connection refused"));

    const response = await post("apt-008", { answers: {} });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao registrar o preparo.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
