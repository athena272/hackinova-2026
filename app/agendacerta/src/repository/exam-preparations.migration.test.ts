import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Segurança e integridade da migration do checklist de preparo.
 * Regressões evitadas: tabela exposta à Data API sem RLS, permission denied
 * no service_role e resposta de preparo pela metade gravada no agendamento.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const sql = readFileSync(
  join(migrationsDir, "20261007120000_create_exam_preparations.sql"),
  "utf8",
);
const seedSql = readFileSync(
  join(migrationsDir, "20261007120100_seed_exam_preparations.sql"),
  "utf8",
);

const TABLES = ["exam_preparations", "exam_preparation_items"];

describe("migration exam_preparations", () => {
  it.each(TABLES)("cria a tabela %s com RLS e deny para anon/authenticated", (table) => {
    expect(sql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
    expect(sql).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
    for (const role of ["anon", "authenticated"]) {
      expect(sql).toMatch(
        new RegExp(
          `create policy "${table}_deny_${role}"\\s+on public\\.${table}\\s+for all\\s+to ${role}\\s+using \\(false\\)\\s+with check \\(false\\)`,
          "i",
        ),
      );
    }
  });

  it.each(TABLES)("concede GRANT ao service_role em %s", (table) => {
    expect(sql).toMatch(
      new RegExp(
        `grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`,
        "i",
      ),
    );
  });

  it.each(TABLES)("define search_path na trigger function de %s", (table) => {
    expect(sql).toMatch(
      new RegExp(
        `function public\\.set_${table}_updated_at[\\s\\S]*?set search_path = public`,
        "i",
      ),
    );
  });

  it("um nome de exame tem um preparo só e os itens têm posição única dentro dele", () => {
    expect(sql).toMatch(/constraint exam_preparations_exam_name_key unique \(exam_name\)/i);
    expect(sql).toMatch(
      /constraint exam_preparation_items_position_key unique \(preparation_id, position\)/i,
    );
    expect(sql).toMatch(
      /preparation_id text not null references public\.exam_preparations \(id\) on delete cascade/i,
    );
  });

  it("cria o enum preparation_result e concede uso ao service_role", () => {
    expect(sql).toMatch(
      /create type public\.preparation_result as enum \(\s*'ok',\s*'nao_cumprido'\s*\)/i,
    );
    expect(sql).toMatch(
      /grant\s+usage\s+on\s+type\s+public\.preparation_result\s+to\s+service_role/i,
    );
  });

  it("só aceita resposta completa: resultado e data juntos", () => {
    expect(sql).toMatch(
      /check \(\(preparation_result is null\) = \(preparation_answered_at is null\)\)/i,
    );
  });

  it("itens não cumpridos existem se, e só se, o preparo não foi cumprido", () => {
    expect(sql).toMatch(
      /\(preparation_result is not distinct from 'nao_cumprido'\)\s+= \(cardinality\(preparation_missed_item_ids\) > 0\)/i,
    );
    expect(sql).toMatch(/preparation_missed_item_ids text\[\] not null default '\{\}'/i);
  });

  it("deixa os dados de demonstração na migration de seed", () => {
    expect(sql).not.toMatch(/insert into/i);
    expect(seedSql).not.toMatch(/create table|alter type/i);
  });
});
