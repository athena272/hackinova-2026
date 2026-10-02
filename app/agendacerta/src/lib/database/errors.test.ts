import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { describeDatabaseError, isRecordNotFoundError } from "./errors";

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("erro do Prisma", {
    code,
    clientVersion: "7.10.0",
  });
}

describe("isRecordNotFoundError", () => {
  it("reconhece P2025 (registro não encontrado)", () => {
    expect(isRecordNotFoundError(knownError("P2025"))).toBe(true);
  });

  it("ignora outros códigos do Prisma", () => {
    expect(isRecordNotFoundError(knownError("P2002"))).toBe(false);
  });

  it("ignora erros que não são do Prisma", () => {
    expect(isRecordNotFoundError(new Error("P2025"))).toBe(false);
    expect(isRecordNotFoundError({ code: "P2025" })).toBe(false);
  });
});

describe("describeDatabaseError", () => {
  it("prefixa o contexto e preserva a causa", () => {
    const cause = new Error("Can't reach database server");
    const error = describeDatabaseError("Falha ao listar agendamentos", cause);

    expect(error.message).toBe(
      "Falha ao listar agendamentos: Can't reach database server",
    );
    expect(error.cause).toBe(cause);
  });

  it("usa mensagem genérica quando o erro não tem texto", () => {
    expect(describeDatabaseError("Falha ao oferecer vaga", "x").message).toBe(
      "Falha ao oferecer vaga: erro desconhecido no banco de dados",
    );
  });
});
