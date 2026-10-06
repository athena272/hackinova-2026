import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfferSlotError } from "@/domain/offer-slot";
import { SlotOfferError } from "@/domain/slot-offer";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";
import { SlotOfferNotFoundError } from "@/repository/errors";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/slot-offers/deps", () => ({
  createSlotOfferDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/slot-offers/respond-slot-offer", () => ({
  respondSlotOffer: vi.fn(),
}));

import { respondSlotOffer } from "@/application/slot-offers/respond-slot-offer";
import { requireClinicSession } from "@/lib/auth/require-session";
import { POST } from "./route";

function post(body: unknown, id = "offer-1") {
  return POST(
    new Request(`http://localhost/api/slot-offers/${id}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

describe("POST /api/slot-offers/[id]/response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não registra a resposta", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await post({ response: "aceitar" });

    expect(response.status).toBe(401);
    expect(respondSlotOffer).not.toHaveBeenCalled();
  });

  it("registra a recusa e devolve a próxima oferta", async () => {
    const result = {
      response: "recusar" as const,
      offer: pendingOffer({ status: "recusada", closedAt: "2026-10-06T15:01:00.000Z" }),
      nextOffer: pendingOffer({ id: "offer-2" }),
    };
    vi.mocked(respondSlotOffer).mockResolvedValue(result);

    const response = await post({ response: "recusar" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(result);
    expect(respondSlotOffer).toHaveBeenCalledWith({}, "offer-1", "recusar");
  });

  it.each([{}, { response: "talvez" }, { response: 1 }])(
    "recusa resposta fora de aceitar/recusar (%j)",
    async (body) => {
      const response = await post(body);

      expect(response.status).toBe(400);
      expect(respondSlotOffer).not.toHaveBeenCalled();
    },
  );

  it("recusa JSON inválido", async () => {
    expect((await post("não é json")).status).toBe(400);
  });

  it("responde 400 com código quando o prazo acabou", async () => {
    vi.mocked(respondSlotOffer).mockRejectedValue(
      new SlotOfferError("OFFER_EXPIRED", "O prazo acabou."),
    );

    const response = await post({ response: "aceitar" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "O prazo acabou.",
      code: "OFFER_EXPIRED",
    });
  });

  it("responde 400 com código quando a regra do aceite falha", async () => {
    vi.mocked(respondSlotOffer).mockRejectedValue(
      new OfferSlotError("CANDIDATE_NOT_WAITING", "Candidato já foi atribuído."),
    );

    const response = await post({ response: "aceitar" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "CANDIDATE_NOT_WAITING" });
  });

  it("responde 404 quando a oferta não existe", async () => {
    vi.mocked(respondSlotOffer).mockRejectedValue(new SlotOfferNotFoundError("offer-999"));

    expect((await post({ response: "aceitar" }, "offer-999")).status).toBe(404);
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(respondSlotOffer).mockRejectedValue(new Error("boom"));

    const response = await post({ response: "aceitar" });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao registrar a resposta da oferta.",
    });
  });
});
