import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuplicateBookingError } from "@/domain/duplicate-booking";
import {
  booking,
  resolvedCheck,
  september,
} from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import { DuplicateCheckConflictError, DuplicateCheckNotFoundError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/duplicate-bookings/deps", () => ({
  createDuplicateBookingDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/duplicate-bookings/choose-duplicate-booking", () => ({
  chooseDuplicateBooking: vi.fn(),
}));

import { chooseDuplicateBooking } from "@/application/duplicate-bookings/choose-duplicate-booking";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

function post(body: unknown, id = "dup-1") {
  return POST(
    new Request(`http://localhost/api/duplicate-bookings/${id}/choice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/duplicate-bookings/[id]/choice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não registra a escolha", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    expect((await post({ keepAppointmentId: "apt-a" })).status).toBe(401);
    expect(chooseDuplicateBooking).not.toHaveBeenCalled();
  });

  it("registra a escolha e devolve o mantido e os liberados", async () => {
    const result = {
      check: resolvedCheck(),
      kept: booking({ id: "apt-a", status: "confirmado" }),
      released: [booking({ id: "apt-b", scheduledAt: september(24), status: "liberado" })],
    };
    vi.mocked(chooseDuplicateBooking).mockResolvedValue(result);

    const response = await post({ keepAppointmentId: "apt-a" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(chooseDuplicateBooking).toHaveBeenCalledWith({}, "dup-1", "apt-a");
  });

  it.each([{}, { keepAppointmentId: "" }, { keepAppointmentId: "   " }, { keepAppointmentId: 1 }])(
    "recusa horário inválido (%j)",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      expect(chooseDuplicateBooking).not.toHaveBeenCalled();
    },
  );

  it("recusa JSON inválido", async () => {
    expect((await post("não é json")).status).toBe(400);
  });

  it.each(["CHECK_NOT_OPEN", "APPOINTMENT_NOT_IN_CHECK", "APPOINTMENT_NOT_ACTIVE", "GROUP_DISSOLVED"] as const)(
    "responde 400 com o código %s",
    async (code) => {
      vi.mocked(chooseDuplicateBooking).mockRejectedValue(new DuplicateBookingError(code, "Regra da escolha."));

      const response = await post({ keepAppointmentId: "apt-a" });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Regra da escolha.", code });
    },
  );

  it("responde 404 quando a confirmação não existe", async () => {
    vi.mocked(chooseDuplicateBooking).mockRejectedValue(new DuplicateCheckNotFoundError("dup-x"));

    expect((await post({ keepAppointmentId: "apt-a" }, "dup-x")).status).toBe(404);
  });

  it("responde 409 quando a confirmação acabou de ser respondida", async () => {
    vi.mocked(chooseDuplicateBooking).mockRejectedValue(new DuplicateCheckConflictError("dup-1"));

    const response = await post({ keepAppointmentId: "apt-a" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "DUPLICATE_CHECK_CONFLICT" });
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(chooseDuplicateBooking).mockRejectedValue(new Error("boom"));

    const response = await post({ keepAppointmentId: "apt-a" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao registrar a escolha do paciente.",
    });
  });
});
