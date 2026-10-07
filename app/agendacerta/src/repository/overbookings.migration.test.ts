import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Segurança e integridade da migration do encaixe guiado pelo score.
 * Regressões evitadas: tabela exposta à Data API sem RLS, permission denied no
 * service_role, dois aceites simultâneos furando o limite do bloco e decisão
 * aceita sem o agendamento encaixe.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const sql = readFileSync(join(migrationsDir, "20261009120000_create_overbookings.sql"), "utf8");

describe("migration overbookings", () => {
  it("cria a tabela com RLS e deny para anon/authenticated", () => {
    expect(sql).toMatch(/create table public\.overbookings/i);
    expect(sql).toMatch(/alter table public\.overbookings enable row level security/i);
    for (const role of ["anon", "authenticated"]) {
      expect(sql).toMatch(
        new RegExp(
          `create policy "overbookings_deny_${role}"\\s+on public\\.overbookings\\s+for all\\s+to ${role}\\s+using \\(false\\)\\s+with check \\(false\\)`,
          "i",
        ),
      );
    }
  });

  it("concede GRANT ao service_role na tabela e no enum", () => {
    expect(sql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.overbookings\s+to\s+service_role/i,
    );
    expect(sql).toMatch(/grant\s+usage\s+on\s+type\s+public\.overbooking_decision\s+to\s+service_role/i);
  });

  it("cria o enum com as duas decisões", () => {
    expect(sql).toMatch(
      /create type public\.overbooking_decision as enum \(\s*'aceita',\s*'recusada'\s*\)/i,
    );
  });

  it("liga âncora e encaixe a appointments, com um encaixe por agendamento", () => {
    expect(sql).toMatch(/anchor_appointment_id text not null references public\.appointments \(id\)/i);
    expect(sql).toMatch(/encaixe_appointment_id text unique references public\.appointments \(id\)/i);
  });

  it("define search_path na trigger function de updated_at", () => {
    expect(sql).toMatch(
      /function public\.set_overbookings_updated_at\(\)[\s\S]*?set search_path = public/i,
    );
  });

  it("checks: aceite sempre com encaixe e número, número positivo e probabilidade de 0 a 100", () => {
    expect(sql).toMatch(/check \(\(decision = 'aceita'\) = \(encaixe_appointment_id is not null\)\)/i);
    expect(sql).toMatch(/check \(\(decision = 'aceita'\) = \(sequence is not null\)\)/i);
    expect(sql).toMatch(/check \(sequence is null or sequence >= 1\)/i);
    expect(sql).toMatch(/check \(risk_probability between 0 and 100\)/i);
  });

  it("um número de encaixe por bloco e uma recusa por bloco (índices únicos parciais)", () => {
    expect(sql).toMatch(
      /create unique index overbookings_sequence_per_block\s+on public\.overbookings \(specialty, scheduled_at, sequence\)\s+where decision = 'aceita'/i,
    );
    expect(sql).toMatch(
      /create unique index overbookings_one_refusal_per_block\s+on public\.overbookings \(specialty, scheduled_at\)\s+where decision = 'recusada'/i,
    );
  });
});
