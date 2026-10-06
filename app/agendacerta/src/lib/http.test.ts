import { describe, expect, it, vi } from "vitest";
import { getApiJson, postApiJson, readResponseJson } from "./http";

describe("postApiJson", () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  it("envia o corpo como JSON e devolve a resposta", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, 201));

    await expect(postApiJson("/api/x", { a: 1 }, "Falha.", fetcher)).resolves.toEqual({
      ok: true,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"a":1}',
    });
  });

  it("usa a mensagem da API e, sem ela, a padrão", async () => {
    const withMessage = vi.fn().mockResolvedValue(jsonResponse({ error: "Prazo inválido." }, 400));
    const withoutMessage = vi.fn().mockResolvedValue(jsonResponse({}, 500));

    await expect(postApiJson("/api/x", {}, "Falha.", withMessage)).rejects.toThrow(
      "Prazo inválido.",
    );
    await expect(postApiJson("/api/x", {}, "Falha padrão.", withoutMessage)).rejects.toThrow(
      "Falha padrão.",
    );
  });
});

describe("getApiJson", () => {
  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status });

  it("faz GET sem cache e devolve o corpo", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ items: [1] }));

    await expect(getApiJson("/api/x", "Falha.", fetcher)).resolves.toEqual({ items: [1] });
    expect(fetcher).toHaveBeenCalledWith("/api/x", { cache: "no-store" });
  });

  it("usa a mensagem da API quando a resposta é de erro", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ error: "Sem sessão." }, 401));

    await expect(getApiJson("/api/x", "Falha.", fetcher)).rejects.toThrow("Sem sessão.");
  });

  it("usa a mensagem padrão quando o erro não traz motivo", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, 500));

    await expect(getApiJson("/api/x", "Falha padrão.", fetcher)).rejects.toThrow(
      "Falha padrão.",
    );
  });
});

describe("readResponseJson", () => {
  it("parseia JSON válido", async () => {
    const response = new Response(JSON.stringify({ appointments: [] }), {
      status: 200,
    });
    await expect(readResponseJson<{ appointments: unknown[] }>(response)).resolves.toEqual({
      appointments: [],
    });
  });

  it("falha com mensagem clara quando o corpo está vazio (regressão Vercel 500)", async () => {
    const response = new Response("", { status: 500 });

    await expect(readResponseJson(response)).rejects.toThrow(
      /Resposta vazia da API \(HTTP 500\)/,
    );
  });

  it("trata corpo só com whitespace como vazio", async () => {
    const response = new Response("   \n\t  ", { status: 502 });

    await expect(readResponseJson(response)).rejects.toThrow(
      /Resposta vazia da API \(HTTP 502\)/,
    );
  });

  it("não propaga Unexpected end of JSON input em corpo vazio", async () => {
    const response = new Response("", { status: 500 });

    const error = await readResponseJson(response).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/Resposta vazia da API \(HTTP 500\)/);
    expect((error as Error).message).not.toMatch(/Unexpected end of JSON input/);
  });

  it("falha com mensagem clara quando o corpo não é JSON", async () => {
    const response = new Response("<html>error</html>", { status: 500 });

    await expect(readResponseJson(response)).rejects.toThrow(
      /Resposta inválida da API \(HTTP 500\)/,
    );
  });
});
