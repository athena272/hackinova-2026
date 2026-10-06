import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SlotOfferCascade } from "@/domain/slot-offer";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/slot-offers/deps", () => ({
  createSlotOfferDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/slot-offers/list-slot-offers", () => ({
  listSlotOffers: vi.fn(),
}));

import { listSlotOffers } from "@/application/slot-offers/list-slot-offers";
import { requireClinicSession } from "@/lib/auth/require-session";
import { GET } from "./route";

const request = () => new Request("http://localhost/api/slot-offers");

describe("GET /api/slot-offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não sincroniza nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(listSlotOffers).not.toHaveBeenCalled();
  });

  it("devolve o histórico agrupado por vaga", async () => {
    const cascades: SlotOfferCascade[] = [
      { appointmentId: "apt-006", offers: [pendingOffer()], state: "em_andamento" },
    ];
    vi.mocked(listSlotOffers).mockResolvedValue(cascades);

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cascades });
  });

  it("responde 500 com mensagem genérica em falha do banco", async () => {
    vi.mocked(listSlotOffers).mockRejectedValue(new Error("Falha ao listar ofertas pendentes: timeout"));

    const response = await GET(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao carregar as ofertas de vaga.",
    });
    expect(console.error).toHaveBeenCalled();
  });
});
