import { describe, expect, it } from "vitest";
import { readResponseJson } from "./http";

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
