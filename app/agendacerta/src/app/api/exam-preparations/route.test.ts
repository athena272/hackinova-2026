import { beforeEach, describe, expect, it, vi } from "vitest";
import { ULTRASSOM } from "@/domain/exam-preparation/exam-preparation.test-utils";
import {
  authorizedSessionCheck,
  unauthorizedSessionCheck,
} from "@/lib/auth/session-check.test-utils";

vi.mock("@/lib/auth/require-session", () => ({
  requireClinicSession: vi.fn(),
}));

const list = vi.fn();
vi.mock("@/repository/create-exam-preparation-repository", () => ({
  createExamPreparationRepository: vi.fn(() => ({ list, findByExamName: vi.fn() })),
}));

import { requireClinicSession } from "@/lib/auth/require-session";
import { createExamPreparationRepository } from "@/repository/create-exam-preparation-repository";
import { GET as getHandler } from "./route";

function GET() {
  return getHandler(new Request("http://localhost/api/exam-preparations"));
}

describe("GET /api/exam-preparations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requireClinicSession).mockResolvedValue(authorizedSessionCheck());
  });

  it("responde 401 sem sessão e não consulta o cadastro", async () => {
    vi.mocked(requireClinicSession).mockResolvedValue(unauthorizedSessionCheck());

    const response = await GET();

    expect(response.status).toBe(401);
    expect(createExamPreparationRepository).not.toHaveBeenCalled();
  });

  it("devolve o cadastro de preparo", async () => {
    list.mockResolvedValue([ULTRASSOM]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ preparations: [ULTRASSOM] });
  });

  it("responde 500 com a mensagem do repositório", async () => {
    list.mockRejectedValue(new Error("Falha ao listar preparos: relation does not exist"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao listar preparos: relation does not exist",
    });
  });

  it("responde 500 com motivo genérico quando o erro não tem mensagem", async () => {
    list.mockRejectedValue("boom");

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Falha ao listar preparos: erro interno",
    });
  });
});
