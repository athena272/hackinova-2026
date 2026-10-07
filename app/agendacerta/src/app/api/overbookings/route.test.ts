import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

vi.mock("@/application/overbooking/deps", () => ({
  createOverbookingDeps: vi.fn(() => ({})),
}));

vi.mock("@/application/overbooking/list-overbookings", () => ({
  listOverbookings: vi.fn(),
}));

import { listOverbookings } from "@/application/overbooking/list-overbookings";
import { requireClinicSession } from "@/lib/auth/require-session";
import { GET } from "./route";

function get() {
  return GET(new Request("http://localhost/api/overbookings"));
}

describe("GET /api/overbookings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não calcula sugestões", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await get();

    expect(response.status).toBe(401);
    expect(listOverbookings).not.toHaveBeenCalled();
  });

  it("devolve sugestões, encaixes e vagas cobertas", async () => {
    const overview = {
      suggestions: [],
      encaixeAppointmentIds: ["apt-enc-1"],
      coveredAppointmentIds: ["apt-001"],
    };
    vi.mocked(listOverbookings).mockResolvedValue(overview);

    const response = await get();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(overview);
  });

  it("responde 500 com mensagem genérica em falha inesperada", async () => {
    vi.mocked(listOverbookings).mockRejectedValue(new Error("db down"));

    const response = await get();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Erro interno ao buscar sugestões de encaixe.",
    });
  });
});
