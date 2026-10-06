import { describe, expect, it, vi } from "vitest";
import { ULTRASSOM } from "@/domain/exam-preparation/exam-preparation.test-utils";
import { fetchExamPreparations } from "./use-exam-preparations";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe("fetchExamPreparations", () => {
  it("devolve o cadastro de preparo", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ preparations: [ULTRASSOM] }));

    await expect(fetchExamPreparations(fetcher)).resolves.toEqual([ULTRASSOM]);
    expect(fetcher).toHaveBeenCalledWith("/api/exam-preparations", { cache: "no-store" });
  });

  it("usa a mensagem da API quando a listagem falha", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "Falha ao listar preparos: timeout" }, 500));

    await expect(fetchExamPreparations(fetcher)).rejects.toThrow(
      "Falha ao listar preparos: timeout",
    );
  });

  it("falha com mensagem clara quando a resposta não traz o cadastro", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}));

    await expect(fetchExamPreparations(fetcher)).rejects.toThrow(
      "Falha ao carregar o cadastro de preparo.",
    );
  });
});
