import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { readResponseJson } from "@/lib/http";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/lib/database/env", () => ({
  hasDatabaseConfig: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(),
}));

import { requireClinicSession } from "@/lib/auth/require-session";
import { hasDatabaseConfig } from "@/lib/database/env";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { GET as getHandler } from "./route";

function GET() {
  return getHandler(new Request("http://localhost/api/appointments"));
}

function mockRepo(
  partial: Partial<AppointmentRepository>,
): AppointmentRepository {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    confirm: vi.fn(),
    saveOffered: vi.fn(),
    ...partial,
  };
}

describe("GET /api/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não consulta o repositório", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Sessão expirada. Faça login novamente.",
    });
    expect(createAppointmentRepository).not.toHaveBeenCalled();
  });

  it("retorna lista e source memory quando o banco não está configurado", async () => {
    vi.mocked(hasDatabaseConfig).mockReturnValue(false);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi.fn().mockResolvedValue([
          {
            id: "apt-001",
            patientId: "pat-6f020c3c9b97",
            patientName: "Ana Souza",
            specialty: "Neurologia",
            scheduledAt: "2026-09-22T12:00:00.000Z",
            status: "pendente",
            phoneMasked: "(79) 9****-1234",
            procedure: { type: "consulta" },
          },
        ]),
      }),
    );

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      source: "memory",
      appointments: [
        expect.objectContaining({ id: "apt-001", status: "pendente" }),
      ],
    });
  });

  it("retorna JSON 500 com error e source quando o repositório falha", async () => {
    vi.mocked(hasDatabaseConfig).mockReturnValue(true);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi
          .fn()
          .mockRejectedValue(
            new Error(
              "Falha ao listar agendamentos: relation does not exist",
            ),
          ),
      }),
    );

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({
      source: "supabase",
      error: "Falha ao listar agendamentos: relation does not exist",
    });
  });

  it("retorna JSON 500 legível quando o banco está inacessível", async () => {
    vi.mocked(hasDatabaseConfig).mockReturnValue(true);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi.fn().mockRejectedValue(
          new Error(
            "Falha ao listar agendamentos: Can't reach database server at db.example.com:6543",
          ),
        ),
      }),
    );

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.source).toBe("supabase");
    expect(body.error).toBe(
      "Falha ao listar agendamentos: Can't reach database server at db.example.com:6543",
    );
  });

  it("permite ao cliente ler o JSON de erro sem Unexpected end of JSON input", async () => {
    vi.mocked(hasDatabaseConfig).mockReturnValue(true);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi.fn().mockRejectedValue(new Error("JWT inválido")),
      }),
    );

    const apiResponse = await GET();
    const clientResponse = new Response(await apiResponse.text(), {
      status: apiResponse.status,
    });

    const payload = await readResponseJson<{ error: string; source: string }>(
      clientResponse,
    );

    expect(payload.error).toBe("JWT inválido");
    expect(payload.source).toBe("supabase");
  });
});
