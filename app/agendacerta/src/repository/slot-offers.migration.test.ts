import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SLOT_OFFER_TIMEOUT_OPTIONS } from "@/domain/slot-offer";

/**
 * Segurança e integridade da migration da oferta em cascata.
 * Regressões evitadas: tabela exposta à Data API sem RLS, permission denied no
 * service_role, duas ofertas abertas para a mesma vaga ou o mesmo candidato e
 * prazos no banco diferentes das opções da tela.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const sql = readFileSync(join(migrationsDir, "20261008120000_create_slot_offers.sql"), "utf8");

describe("migration slot_offers", () => {
  it("cria a tabela com RLS e deny para anon/authenticated", () => {
    expect(sql).toMatch(/create table public\.slot_offers/i);
    expect(sql).toMatch(/alter table public\.slot_offers enable row level security/i);
    for (const role of ["anon", "authenticated"]) {
      expect(sql).toMatch(
        new RegExp(
          `create policy "slot_offers_deny_${role}"\\s+on public\\.slot_offers\\s+for all\\s+to ${role}\\s+using \\(false\\)\\s+with check \\(false\\)`,
          "i",
        ),
      );
    }
  });

  it("concede GRANT ao service_role na tabela e no enum", () => {
    expect(sql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.slot_offers\s+to\s+service_role/i,
    );
    expect(sql).toMatch(/grant\s+usage\s+on\s+type\s+public\.slot_offer_status\s+to\s+service_role/i);
  });

  it("cria o enum com os quatro status do domínio", () => {
    expect(sql).toMatch(
      /create type public\.slot_offer_status as enum \(\s*'pendente',\s*'aceita',\s*'recusada',\s*'expirada'\s*\)/i,
    );
  });

  it("define search_path na trigger function de updated_at", () => {
    expect(sql).toMatch(
      /function public\.set_slot_offers_updated_at\(\)[\s\S]*?set search_path = public/i,
    );
  });

  it("uma oferta aberta por vaga e uma por candidato (índices únicos parciais)", () => {
    expect(sql).toMatch(
      /create unique index slot_offers_one_pending_per_appointment\s+on public\.slot_offers \(appointment_id\)\s+where status = 'pendente'/i,
    );
    expect(sql).toMatch(
      /create unique index slot_offers_one_pending_per_candidate\s+on public\.slot_offers \(waitlist_id\)\s+where status = 'pendente'/i,
    );
  });

  it("checks: prazo depois da oferta, encerramento junto com a resposta e distância não negativa", () => {
    expect(sql).toMatch(/check \(expires_at > offered_at\)/i);
    expect(sql).toMatch(/check \(\(status = 'pendente'\) = \(closed_at is null\)\)/i);
    expect(sql).toMatch(/check \(closed_at is null or closed_at >= offered_at\)/i);
    expect(sql).toMatch(/check \(distance_km is null or distance_km >= 0\)/i);
  });

  it("o check do prazo aceita exatamente as opções da tela", () => {
    const match = sql.match(/check \(timeout_minutes in \(([^)]+)\)\)/i);
    expect(match).not.toBeNull();
    const options = match![1].split(",").map((value) => Number(value.trim()));
    expect(options).toEqual([...SLOT_OFFER_TIMEOUT_OPTIONS]);
  });

  it("guarda a data de entrada na lista de espera, obrigatória", () => {
    expect(sql).toMatch(
      /alter table public\.waitlist\s+add column requested_at timestamptz not null default now\(\)/i,
    );
  });
});
