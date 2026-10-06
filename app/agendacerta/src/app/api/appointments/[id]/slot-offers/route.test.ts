import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlotOfferError } from "@/domain/slot-offer";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import { AppointmentNotFoundError, SlotOfferConflictError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/slot-offers/deps", () => ({
  createSlotOfferDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/slot-offers/start-slot-offer", () => ({
  startSlotOffer: vi.fn(),
}));

import { startSlotOffer } from "@/application/slot-offers/start-slot-offer";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

function post(body: unknown, id = "apt-006") {
  return POST(
    new Request(`http://localhost/api/appointments/${id}/slot-offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/appointments/[id]/slot-offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não inicia a oferta", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await post({ timeoutMinutes: 15 });

    expect(response.status).toBe(401);
    expect(startSlotOffer).not.toHaveBeenCalled();
  });

  it("inicia a oferta com o prazo do corpo e responde 201", async () => {
    const offer = pendingOffer();
    vi.mocked(startSlotOffer).mockResolvedValue(offer);

    const response = await post({ timeoutMinutes: 5 });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ offer });
    expect(startSlotOffer).toHaveBeenCalledWith({}, "apt-006", 5);
  });

  it("recusa JSON inválido", async () => {
    const response = await post("{");

    expect(response.status).toBe(400);
    expect(startSlotOffer).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_TIMEOUT", "Prazo de resposta inválido: 7."],
    ["NO_CANDIDATES", "Ninguém na lista de espera."],
    ["CASCADE_ALREADY_ACTIVE", "A vaga já tem uma oferta aguardando resposta."],
  ] as const)("responde 400 com o código %s", async (code, message) => {
    vi.mocked(startSlotOffer).mockRejectedValue(new SlotOfferError(code, message));

    const response = await post({ timeoutMinutes: 7 });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message, code });
  });

  it("responde 404 quando a vaga não existe", async () => {
    vi.mocked(startSlotOffer).mockRejectedValue(new AppointmentNotFoundError("apt-999"));

    const response = await post({ timeoutMinutes: 15 }, "apt-999");

    expect(response.status).toBe(404);
  });

  it("responde 409 quando outra requisição abriu a oferta ao mesmo tempo", async () => {
    vi.mocked(startSlotOffer).mockRejectedValue(new SlotOfferConflictError("offer-1"));

    const response = await post({ timeoutMinutes: 15 });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "OFFER_CONFLICT" });
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(startSlotOffer).mockRejectedValue(new Error("connection reset"));

    const response = await post({ timeoutMinutes: 15 });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao iniciar a oferta da vaga.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
