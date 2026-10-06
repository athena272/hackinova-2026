import { describe, expect, it, vi } from "vitest";
import type { NoShowRisk } from "@/domain/no-show-risk";
import { fetchNoShowRisks } from "./use-no-show-risks";

const risk: NoShowRisk = {
  appointmentId: "apt-001",
  probability: 64,
  band: "alto",
  reasons: [],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("fetchNoShowRisks", () => {
  it("indexa os riscos por agendamento", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ risks: [risk] }));

    const risksById = await fetchNoShowRisks(fetcher);

    expect(risksById.get("apt-001")).toEqual(risk);
    expect(fetcher).toHaveBeenCalledWith("/api/appointments/risk", { cache: "no-store" });
  });

  it("usa a mensagem da API quando o cálculo falha", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Falha ao calcular risco: timeout" }, 500));

    await expect(fetchNoShowRisks(fetcher)).rejects.toThrow("Falha ao calcular risco: timeout");
  });

  it("falha com mensagem clara quando o corpo vem vazio", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 500 }));

    await expect(fetchNoShowRisks(fetcher)).rejects.toThrow(/Resposta vazia da API/);
  });
});
