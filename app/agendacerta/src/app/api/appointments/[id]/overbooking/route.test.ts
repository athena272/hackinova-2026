import { beforeEach, describe, expect, it, vi } from "vitest";
import { OverbookingError } from "@/domain/overbooking";
import { accepted, appointment, refused } from "@/domain/overbooking/overbooking.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import {
  AppointmentNotFoundError,
  OverbookingConflictError,
  WaitlistNotFoundError,
} from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/overbooking/deps", () => ({
  createOverbookingDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/overbooking/decide-overbooking", () => ({
  decideOverbooking: vi.fn(),
}));

import { decideOverbooking } from "@/application/overbooking/decide-overbooking";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

function post(body: unknown, id = "apt-001") {
  return POST(
    new Request(`http://localhost/api/appointments/${id}/overbooking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/appointments/[id]/overbooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não registra a decisão", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await post({ decision: "aceitar" });

    expect(response.status).toBe(401);
    expect(decideOverbooking).not.toHaveBeenCalled();
  });

  it("aceite responde 201 com o encaixe criado", async () => {
    const result = {
      decision: "aceitar" as const,
      overbooking: accepted(),
      appointment: appointment({ id: "apt-enc-1", patientName: "Helena Dias" }),
    };
    vi.mocked(decideOverbooking).mockResolvedValue(result);

    const response = await post({ decision: "aceitar" });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(result);
    expect(decideOverbooking).toHaveBeenCalledWith({}, "apt-001", "aceitar");
  });

  it("recusa responde 200 com a decisão registrada", async () => {
    const result = { decision: "recusar" as const, overbooking: refused() };
    vi.mocked(decideOverbooking).mockResolvedValue(result);

    const response = await post({ decision: "recusar" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
  });

  it.each([{}, { decision: "talvez" }, { decision: "aceita" }, { decision: 1 }])(
    "recusa decisão fora de aceitar/recusar (%j)",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      expect(decideOverbooking).not.toHaveBeenCalled();
    },
  );

  it("recusa JSON inválido", async () => {
    expect((await post("não é json")).status).toBe(400);
  });

  it.each(["LIMIT_REACHED", "NOT_HIGH_RISK", "ALREADY_REFUSED", "NO_CANDIDATES"] as const)(
    "responde 400 com o código %s",
    async (code) => {
      vi.mocked(decideOverbooking).mockRejectedValue(new OverbookingError(code, "Regra do encaixe."));

      const response = await post({ decision: "aceitar" });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Regra do encaixe.", code });
    },
  );

  it.each([new AppointmentNotFoundError("apt-999"), new WaitlistNotFoundError("wl-999")])(
    "responde 404 quando falta o agendamento ou o candidato",
    async (error) => {
      vi.mocked(decideOverbooking).mockRejectedValue(error);

      expect((await post({ decision: "aceitar" }, "apt-999")).status).toBe(404);
    },
  );

  it("responde 409 quando outra decisão chegou antes", async () => {
    vi.mocked(decideOverbooking).mockRejectedValue(new OverbookingConflictError("ovb-1"));

    const response = await post({ decision: "aceitar" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "OVERBOOKING_CONFLICT" });
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(decideOverbooking).mockRejectedValue(new Error("boom"));

    const response = await post({ decision: "recusar" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao registrar a decisão do encaixe.",
    });
  });
});
