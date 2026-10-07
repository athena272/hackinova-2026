import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuplicateBookingError } from "@/domain/duplicate-booking";
import { openCheck } from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import { DuplicateCheckConflictError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/duplicate-bookings/deps", () => ({
  createDuplicateBookingDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/duplicate-bookings/list-duplicate-bookings", () => ({
  listDuplicateBookings: vi.fn(),
}));

vi.mock("@/application/duplicate-bookings/send-duplicate-check", () => ({
  sendDuplicateCheck: vi.fn(),
}));

import { listDuplicateBookings } from "@/application/duplicate-bookings/list-duplicate-bookings";
import { sendDuplicateCheck } from "@/application/duplicate-bookings/send-duplicate-check";
import { requireClinicSession } from "@/lib/auth/require-session";
import { GET, POST } from "./route";

function get() {
  return GET(new Request("http://localhost/api/duplicate-bookings"));
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/duplicate-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("GET /api/duplicate-bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não calcula nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    expect((await get()).status).toBe(401);
    expect(listDuplicateBookings).not.toHaveBeenCalled();
  });

  it("devolve alertas, horários sinalizados e horários liberados por duplicidade", async () => {
    const overview = {
      alerts: [],
      flaggedAppointmentIds: ["apt-002", "apt-009"],
      releasedAppointmentIds: [],
    };
    vi.mocked(listDuplicateBookings).mockResolvedValue(overview);

    const response = await get();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(overview);
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(listDuplicateBookings).mockRejectedValue(new Error("db down"));

    const response = await get();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao buscar possíveis duplicidades.",
    });
  });
});

describe("POST /api/duplicate-bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não envia nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    expect((await post({ appointmentIds: ["apt-a", "apt-b"] })).status).toBe(401);
    expect(sendDuplicateCheck).not.toHaveBeenCalled();
  });

  it("envia a confirmação reforçada e responde 201", async () => {
    vi.mocked(sendDuplicateCheck).mockResolvedValue(openCheck());

    const response = await post({ appointmentIds: ["apt-a", "apt-b"] });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ check: openCheck() });
    expect(sendDuplicateCheck).toHaveBeenCalledWith({}, ["apt-a", "apt-b"]);
  });

  it.each([{}, { appointmentIds: "apt-a" }, { appointmentIds: ["apt-a"] }, { appointmentIds: ["apt-a", ""] }, { appointmentIds: ["apt-a", 2] }])(
    "recusa lista de horários inválida (%j)",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      expect(sendDuplicateCheck).not.toHaveBeenCalled();
    },
  );

  it("recusa JSON inválido", async () => {
    expect((await post("não é json")).status).toBe(400);
  });

  it.each(["NOT_A_DUPLICATE_GROUP", "ALREADY_SENT"] as const)(
    "responde 400 com o código %s",
    async (code) => {
      vi.mocked(sendDuplicateCheck).mockRejectedValue(new DuplicateBookingError(code, "Regra da duplicidade."));

      const response = await post({ appointmentIds: ["apt-a", "apt-b"] });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Regra da duplicidade.", code });
    },
  );

  it("responde 409 quando a mesma confirmação acabou de ser enviada", async () => {
    vi.mocked(sendDuplicateCheck).mockRejectedValue(new DuplicateCheckConflictError("dup-1"));

    const response = await post({ appointmentIds: ["apt-a", "apt-b"] });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "DUPLICATE_CHECK_CONFLICT" });
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(sendDuplicateCheck).mockRejectedValue(new Error("boom"));

    const response = await post({ appointmentIds: ["apt-a", "apt-b"] });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao enviar a confirmação reforçada.",
    });
  });
});
