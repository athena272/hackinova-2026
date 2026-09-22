import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Garante GRANT ao service_role na waitlist.
 * Regressão: sem isso a Data API responde permission denied.
 */
describe("migrations waitlist (grants)", () => {
  const migrationsDir = join(process.cwd(), "../../supabase/migrations");
  const sql = readFileSync(
    join(migrationsDir, "20260922010000_create_waitlist.sql"),
    "utf8",
  );

  it("cria a tabela waitlist", () => {
    expect(sql).toMatch(/create table public\.waitlist/i);
  });

  it("concede GRANT ao service_role", () => {
    expect(sql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.waitlist\s+to\s+service_role/i,
    );
    expect(sql).toMatch(
      /grant\s+usage\s+on\s+type\s+public\.waitlist_status\s+to\s+service_role/i,
    );
  });

  it("define search_path na trigger function", () => {
    expect(sql).toMatch(
      /function public\.set_waitlist_updated_at[\s\S]*set search_path = public/i,
    );
  });
});
