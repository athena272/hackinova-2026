import { describe, expect, it, vi } from "vitest";
import { accepted } from "@/domain/overbooking/overbooking.test-utils";
import { fetchOverbookings, requestOverbookingDecision } from "./use-overbookings";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const overview = {
  suggestions: [],
  encaixeAppointmentIds: ["apt-enc-1"],
  coveredAppointmentIds: ["apt-001"],
};

describe("fetchOverbookings", () => {
  it("devolve sugestões, encaixes e vagas cobertas da API", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(overview));

    await expect(fetchOverbookings(fetcher)).resolves.toEqual(overview);
    expect(fetcher).toHaveBeenCalledWith("/api/overbookings", { cache: "no-store" });
  });

  it("usa a mensagem da API e falha com clareza quando falta algum campo", async () => {
    const failing = vi.fn().mockResolvedValue(jsonResponse({ error: "Sem sessão." }, 401));
    const partial = vi.fn().mockResolvedValue(jsonResponse({ suggestions: [] }));

    await expect(fetchOverbookings(failing)).rejects.toThrow("Sem sessão.");
    await expect(fetchOverbookings(partial)).rejects.toThrow(
      "Falha ao carregar as sugestões de encaixe.",
    );
  });
});

describe("requestOverbookingDecision", () => {
  it("envia a decisão para o agendamento âncora", async () => {
    const result = { decision: "aceitar", overbooking: accepted() };
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(result, 201));

    await expect(requestOverbookingDecision("apt-001", "aceitar", fetcher)).resolves.toEqual(result);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/appointments/apt-001/overbooking",
      expect.objectContaining({ method: "POST", body: '{"decision":"aceitar"}' }),
    );
  });

  it("mostra o motivo quando o limite foi atingido", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Limite atingido.", code: "LIMIT_REACHED" }, 400));

    await expect(requestOverbookingDecision("apt-001", "aceitar", fetcher)).rejects.toThrow(
      "Limite atingido.",
    );
  });
});
