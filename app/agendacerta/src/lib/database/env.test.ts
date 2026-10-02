import { describe, expect, it } from "vitest";
import { DatabaseConfigError, hasDatabaseConfig, readDatabaseUrl } from "./env";

const LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("readDatabaseUrl", () => {
  it("retorna a URL sem espaços nas pontas", () => {
    expect(readDatabaseUrl({ DATABASE_URL: `  ${LOCAL_DB}  ` })).toBe(LOCAL_DB);
  });

  it("aceita o prefixo postgres://", () => {
    const url = "postgres://user:pass@db.example.com:6543/postgres?sslmode=no-verify";
    expect(readDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it.each([undefined, "", "   "])(
    "lança DatabaseConfigError claro quando DATABASE_URL é %j",
    (value) => {
      const call = () => readDatabaseUrl({ DATABASE_URL: value });
      expect(call).toThrow(DatabaseConfigError);
      expect(call).toThrow(/defina DATABASE_URL/);
    },
  );

  it("rejeita URL que não é Postgres (ex.: SQLite antigo)", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "file:./dev.db" })).toThrow(
      /DATABASE_URL deve começar com postgres/,
    );
  });

  it("rejeita texto que não é URL", () => {
    expect(() => readDatabaseUrl({ DATABASE_URL: "banco-local" })).toThrow(
      /não é uma URL válida/,
    );
  });
});

describe("hasDatabaseConfig", () => {
  it("é true quando DATABASE_URL está definida", () => {
    expect(hasDatabaseConfig({ DATABASE_URL: LOCAL_DB })).toBe(true);
  });

  it.each([undefined, "", "  "])("é false quando DATABASE_URL é %j", (value) => {
    expect(hasDatabaseConfig({ DATABASE_URL: value })).toBe(false);
  });
});
