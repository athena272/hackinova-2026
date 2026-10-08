import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Motivo da liberação nas ofertas da cascata.
 * Regressões evitadas: ofertas antigas sem motivo (coluna sem padrão),
 * permission denied no service_role ao gravar o enum novo.
 */
const sql = readFileSync(
  join(process.cwd(), "../../supabase/migrations/20261011120000_slot_offers_release_reason.sql"),
  "utf8",
);

describe("migration slot_offers.release_reason", () => {
  it("cria o enum dos motivos com GRANT ao service_role", () => {
    expect(sql).toMatch(
      /create type public\.slot_release_reason as enum \(\s*'cancelamento',\s*'preparo',\s*'booking_duplo'\s*\)/i,
    );
    expect(sql).toMatch(/grant\s+usage\s+on\s+type\s+public\.slot_release_reason\s+to\s+service_role/i);
  });

  it("acrescenta a coluna obrigatória com padrão cancelamento, sem quebrar ofertas antigas", () => {
    expect(sql).toMatch(
      /alter table public\.slot_offers\s+add column release_reason public\.slot_release_reason not null default 'cancelamento'/i,
    );
  });
});
