import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoShowRisk } from "@/domain/no-show-risk";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/score-appointments-risk", () => ({
  scoreAppointmentsRisk: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(() => ({ kind: "appointments" })),
}));

vi.mock("@/repository/create-patient-repository", () => ({
  createPatientRepository: vi.fn(() => ({ kind: "patients" })),
}));

import { scoreAppointmentsRisk } from "@/application/score-appointments-risk";
import { requireClinicSession } from "@/lib/auth/require-session";
import { GET as getHandler } from "./route";

function GET() {
  return getHandler(new Request("http://localhost/api/appointments/risk"));
}

const risk: NoShowRisk = {
  appointmentId: "apt-001",
  probability: 64,
  band: "alto",
  reasons: [
    { factor: "historico", points: 25, description: "Faltou 2 das últimas 3 consultas" },
  ],
};

describe("GET /api/appointments/risk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não calcula nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(scoreAppointmentsRisk).not.toHaveBeenCalled();
  });

  it("devolve os riscos calculados com os repositórios da fábrica", async () => {
    vi.mocked(scoreAppointmentsRisk).mockResolvedValue([risk]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ risks: [risk] });
    expect(scoreAppointmentsRisk).toHaveBeenCalledWith(
      { kind: "appointments" },
      { kind: "patients" },
    );
  });

  it("responde 500 com mensagem legível quando o cálculo falha", async () => {
    vi.mocked(scoreAppointmentsRisk).mockRejectedValue(
      new Error("Falha ao listar bairros dos pacientes: timeout"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao calcular risco: Falha ao listar bairros dos pacientes: timeout",
    });
    expect(console.error).toHaveBeenCalled();
  });

  it("responde 500 com motivo genérico quando o erro não tem mensagem", async () => {
    vi.mocked(scoreAppointmentsRisk).mockRejectedValue("boom");

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao calcular risco: erro interno",
    });
  });
});
