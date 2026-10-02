import { describe, expect, it } from "vitest";
import { AuthConfigError, getAuthEnv, MIN_AUTH_SECRET_LENGTH } from "./env";

const VALID_SECRET = "x".repeat(MIN_AUTH_SECRET_LENGTH);
const LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function env(
  overrides: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return {
    DATABASE_URL: LOCAL_DB,
    BETTER_AUTH_SECRET: VALID_SECRET,
    ...overrides,
  };
}

describe("getAuthEnv", () => {
  it("retorna a configuração quando as variáveis são válidas", () => {
    expect(
      getAuthEnv(env({ BETTER_AUTH_URL: "http://localhost:3000" })),
    ).toEqual({
      databaseUrl: LOCAL_DB,
      secret: VALID_SECRET,
      baseUrl: "http://localhost:3000",
    });
  });

  it("aceita BETTER_AUTH_URL ausente", () => {
    expect(getAuthEnv(env({})).baseUrl).toBeUndefined();
  });

  it.each(["DATABASE_URL", "BETTER_AUTH_SECRET"])(
    "lança AuthConfigError claro quando falta %s",
    (name) => {
      const call = () => getAuthEnv(env({ [name]: "  " }));
      expect(call).toThrow(AuthConfigError);
      expect(call).toThrow(new RegExp(`defina ${name}`));
    },
  );

  it("rejeita DATABASE_URL que não é Postgres (ex.: SQLite antigo)", () => {
    expect(() => getAuthEnv(env({ DATABASE_URL: "file:./dev.db" }))).toThrow(
      /DATABASE_URL deve começar com postgres/,
    );
  });

  it("rejeita secret curto", () => {
    expect(() => getAuthEnv(env({ BETTER_AUTH_SECRET: "curto" }))).toThrow(
      /pelo menos 32 caracteres/,
    );
  });

  it("rejeita BETTER_AUTH_URL inválida", () => {
    expect(() => getAuthEnv(env({ BETTER_AUTH_URL: "localhost:3000" }))).toThrow(
      AuthConfigError,
    );
  });
});
