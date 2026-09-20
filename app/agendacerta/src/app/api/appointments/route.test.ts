import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { readResponseJson } from "@/lib/http";

vi.mock("@/lib/supabase/admin", () => ({
  hasSupabaseConfig: vi.fn(),
}));

vi.mock("@/repository/create-appointment-repository", () => ({
  createAppointmentRepository: vi.fn(),
}));

import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { createAppointmentRepository } from "@/repository/create-appointment-repository";
import { GET } from "./route";

function mockRepo(
  partial: Partial<AppointmentRepository>,
): AppointmentRepository {
  return {
    list: vi.fn(),
    getById: vi.fn(),
    confirm: vi.fn(),
    ...partial,
  };
}

describe("GET /api/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("retorna lista e source memory quando Supabase não está configurado", async () => {
    vi.mocked(hasSupabaseConfig).mockReturnValue(false);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi.fn().mockResolvedValue([
          {
            id: "apt-001",
            patientName: "Ana Souza",
            specialty: "Neurologia",
            scheduledAt: "2026-09-22T12:00:00.000Z",
            status: "pendente",
            phoneMasked: "(79) 9****-1234",
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
    vi.mocked(hasSupabaseConfig).mockReturnValue(true);
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

  it("retorna JSON 500 legível para permission denied for table appointments", async () => {
    vi.mocked(hasSupabaseConfig).mockReturnValue(true);
    vi.mocked(createAppointmentRepository).mockReturnValue(
      mockRepo({
        list: vi.fn().mockRejectedValue(
          new Error(
            "Falha ao listar agendamentos: permission denied for table appointments. Confirme o GRANT ao service_role (migration) e que SUPABASE_SERVICE_ROLE_KEY é a secret, não a anon/publishable.",
          ),
        ),
      }),
    );

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.source).toBe("supabase");
    expect(body.error).toContain("permission denied for table appointments");
    expect(body.error).toMatch(/GRANT ao service_role/i);
  });

  it("permite ao cliente ler o JSON de erro sem Unexpected end of JSON input", async () => {
    vi.mocked(hasSupabaseConfig).mockReturnValue(true);
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
