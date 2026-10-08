import { describe, expect, it, vi } from "vitest";
import { computeRecoveryMetrics } from "@/domain/recovery-metrics";
import { DEMO_WEEK, recoveredSlot } from "@/domain/recovery-metrics/recovery-metrics.test-utils";
import { fetchRecoveryMetrics } from "./use-recovery-metrics";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

const metrics = computeRecoveryMetrics({
  recoveredSlots: [recoveredSlot()],
  appointments: [],
  period: DEMO_WEEK,
});

describe("fetchRecoveryMetrics", () => {
  it("pede o período e a data de referência e devolve os indicadores", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(metrics));

    await expect(fetchRecoveryMetrics(DEMO_WEEK, fetcher)).resolves.toEqual(metrics);
    expect(fetcher).toHaveBeenCalledWith("/api/recovery-metrics?period=semana&reference=2026-09-21", {
      cache: "no-store",
    });
  });

  it("usa a mensagem da API quando a resposta é erro", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Período inválido.", code: "INVALID_PERIOD" }, 400));

    await expect(fetchRecoveryMetrics(DEMO_WEEK, fetcher)).rejects.toThrow("Período inválido.");
  });

  it("falha com clareza quando a resposta vem incompleta", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ...metrics, hasData: undefined }));

    await expect(fetchRecoveryMetrics(DEMO_WEEK, fetcher)).rejects.toThrow(
      "Falha ao carregar os indicadores.",
    );
  });
});
