import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeRecoveryMetrics } from "@/domain/recovery-metrics";
import { DEMO_WEEK } from "@/domain/recovery-metrics/recovery-metrics.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/recovery-metrics/deps", () => ({
  createRecoveryMetricsDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/recovery-metrics/get-recovery-metrics", () => ({
  getRecoveryMetrics: vi.fn(),
}));

import { getRecoveryMetrics } from "@/application/recovery-metrics/get-recovery-metrics";
import { requireClinicSession } from "@/lib/auth/require-session";
import { GET } from "./route";

function get(query = "") {
  return GET(new Request(`http://localhost/api/recovery-metrics${query}`));
}

const metrics = computeRecoveryMetrics({ recoveredSlots: [], appointments: [], period: DEMO_WEEK });

describe("GET /api/recovery-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
    vi.mocked(getRecoveryMetrics).mockResolvedValue(metrics);
  });

  it("responde 401 sem sessão e não calcula nada", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    expect((await get()).status).toBe(401);
    expect(getRecoveryMetrics).not.toHaveBeenCalled();
  });

  it("devolve os indicadores do período e da data pedidos", async () => {
    const response = await get("?period=mes&reference=2026-09-24");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(metrics);
    expect(getRecoveryMetrics).toHaveBeenCalledWith({}, { kind: "mes", referenceDate: "2026-09-24" });
  });

  it("sem parâmetros, usa a semana de hoje", async () => {
    await get();

    expect(getRecoveryMetrics).toHaveBeenCalledWith({}, { kind: "semana", referenceDate: undefined });
  });

  it.each(["?period=ano", "?period="])("recusa período inválido (%s)", async (query) => {
    const response = await get(query);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ code: "INVALID_PERIOD" });
    expect(getRecoveryMetrics).not.toHaveBeenCalled();
  });

  it.each(["?reference=24/09/2026", "?reference=2026-02-30", "?reference="])(
    "recusa data de referência inválida (%s)",
    async (query) => {
      const response = await get(query);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({ code: "INVALID_REFERENCE_DATE" });
      expect(getRecoveryMetrics).not.toHaveBeenCalled();
    },
  );

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(getRecoveryMetrics).mockRejectedValue(new Error("db down"));

    const response = await get();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno ao calcular os indicadores." });
  });
});
