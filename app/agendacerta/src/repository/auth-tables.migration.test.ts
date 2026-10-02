import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAuthTables } from "better-auth/db";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { AUTH_TABLES, buildAuthOptions } from "@/lib/auth/server";

/**
 * Garante que a migration das tabelas do Better Auth acompanha a config do app
 * e que as tabelas ficam fora da Data API (credenciais e sessões).
 */
describe("migration auth_* (Better Auth)", () => {
  const migrationsDir = join(process.cwd(), "../../supabase/migrations");
  const sql = readFileSync(
    join(migrationsDir, "20261001000000_create_auth_tables.sql"),
    "utf8",
  );
  const tableNames = Object.values(AUTH_TABLES);

  it.each(tableNames)("cria a tabela public.%s com RLS e deny", (table) => {
    expect(sql).toMatch(new RegExp(`create table public\\.${table}\\s*\\(`, "i"));
    expect(sql).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
    expect(sql).toMatch(
      new RegExp(`on public\\.${table}\\s+for all to anon using \\(false\\)`, "i"),
    );
    expect(sql).toMatch(
      new RegExp(
        `on public\\.${table}\\s+for all to authenticated using \\(false\\)`,
        "i",
      ),
    );
  });

  it("revoga acesso de anon e authenticated e não concede GRANT", () => {
    expect(sql).toMatch(/revoke all on table[\s\S]*from anon, authenticated/i);
    expect(sql).not.toMatch(/^\s*grant\s/im);
  });

  it("tem todas as colunas que o Better Auth espera", () => {
    const options = buildAuthOptions({
      allowSignUp: false,
      env: { databaseUrl: "postgresql://localhost/db", secret: "x".repeat(32) },
      prisma: {} as PrismaClient,
    });
    const tables = getAuthTables(options);

    for (const table of Object.values(tables)) {
      const block = sql.match(
        new RegExp(`create table public\\.${table.modelName}\\s*\\(([\\s\\S]*?)\\n\\);`, "i"),
      )?.[1];
      expect(block, `bloco da tabela ${table.modelName}`).toBeDefined();
      expect(block).toContain('"id" text primary key');
      for (const [key, field] of Object.entries(table.fields)) {
        const column = field.fieldName ?? key;
        expect(block, `${table.modelName}.${column}`).toContain(`"${column}"`);
      }
    }
  });
});
