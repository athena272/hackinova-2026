import { describe, expect, it, vi } from "vitest";
import type { SlotOfferCascade } from "@/domain/slot-offer";
import { pendingOffer } from "@/domain/slot-offer/slot-offer.test-utils";
import {
  acceptedOfferIds,
  fetchSlotOffers,
  hasPendingOffer,
  requestSlotOfferResponse,
  requestStartSlotOffer,
} from "./use-slot-offers";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const ongoing: SlotOfferCascade = {
  appointmentId: "apt-006",
  offers: [pendingOffer()],
  state: "em_andamento",
};
const filled: SlotOfferCascade = {
  appointmentId: "apt-009",
  offers: [
    pendingOffer({ id: "offer-8", appointmentId: "apt-009", status: "recusada", closedAt: "2026-10-06T15:01:00.000Z" }),
    pendingOffer({ id: "offer-9", appointmentId: "apt-009", status: "aceita", closedAt: "2026-10-06T15:03:00.000Z" }),
  ],
  state: "aceita",
};

describe("fetchSlotOffers", () => {
  it("devolve as cascatas da API", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ cascades: [ongoing] }));

    await expect(fetchSlotOffers(fetcher)).resolves.toEqual([ongoing]);
    expect(fetcher).toHaveBeenCalledWith("/api/slot-offers", { cache: "no-store" });
  });

  it("usa a mensagem da API e falha com clareza sem as cascatas", async () => {
    const failing = vi.fn().mockResolvedValue(jsonResponse({ error: "Sem sessão." }, 401));
    const empty = vi.fn().mockResolvedValue(jsonResponse({}));

    await expect(fetchSlotOffers(failing)).rejects.toThrow("Sem sessão.");
    await expect(fetchSlotOffers(empty)).rejects.toThrow("Falha ao carregar as ofertas de vaga.");
  });
});

describe("requestStartSlotOffer e requestSlotOfferResponse", () => {
  it("inicia a oferta com o prazo escolhido", async () => {
    const offer = pendingOffer();
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ offer }, 201));

    await expect(requestStartSlotOffer("apt-006", 5, fetcher)).resolves.toEqual(offer);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/appointments/apt-006/slot-offers",
      expect.objectContaining({ method: "POST", body: '{"timeoutMinutes":5}' }),
    );
  });

  it("mostra o motivo quando a fila está vazia", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Ninguém na lista de espera.", code: "NO_CANDIDATES" }, 400));

    await expect(requestStartSlotOffer("apt-006", 15, fetcher)).rejects.toThrow(
      "Ninguém na lista de espera.",
    );
  });

  it("envia a resposta do candidato", async () => {
    const result = { response: "recusar", offer: pendingOffer({ status: "recusada" }), nextOffer: null };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(result));

    await expect(requestSlotOfferResponse("offer-1", "recusar", fetcher)).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/slot-offers/offer-1/response",
      expect.objectContaining({ method: "POST", body: '{"response":"recusar"}' }),
    );
  });
});

describe("hasPendingOffer e acceptedOfferIds", () => {
  it("só consulta de novo enquanto alguma cascata está em andamento", () => {
    expect(hasPendingOffer([ongoing, filled])).toBe(true);
    expect(hasPendingOffer([filled])).toBe(false);
    expect(hasPendingOffer([])).toBe(false);
  });

  it("junta os ids das ofertas aceitas", () => {
    expect(acceptedOfferIds([ongoing, filled])).toEqual(new Set(["offer-9"]));
  });
});
