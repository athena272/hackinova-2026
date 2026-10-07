import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Segurança e integridade das migrations do booking duplo.
 * Regressões evitadas: tabela exposta à Data API sem RLS, permission denied no
 * service_role, retorno apontando para si mesmo, confirmação resolvida sem o
 * horário mantido e dois envios simultâneos da mesma confirmação.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const unitsSql = readFileSync(
  join(migrationsDir, "20261010120000_clinic_units_and_return_link.sql"),
  "utf8",
);
const checksSql = readFileSync(
  join(migrationsDir, "20261010120100_create_duplicate_booking_checks.sql"),
  "utf8",
);

function expectDenyPolicies(sql: string, table: string) {
  expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  for (const role of ["anon", "authenticated"]) {
    expect(sql).toMatch(
      new RegExp(
        `create policy "${table}_deny_${role}"\\s+on public\\.${table}\\s+for all\\s+to ${role}\\s+using \\(false\\)\\s+with check \\(false\\)`,
        "i",
      ),
    );
  }
}

function expectServiceRoleGrant(sql: string, table: string) {
  expect(sql).toMatch(
    new RegExp(
      `grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`,
      "i",
    ),
  );
}

describe("migration clinic_units e vínculo de retorno", () => {
  it("cria clinic_units com RLS, deny para anon/authenticated e GRANT ao service_role", () => {
    expect(unitsSql).toMatch(/create table public\.clinic_units/i);
    expectDenyPolicies(unitsSql, "clinic_units");
    expectServiceRoleGrant(unitsSql, "clinic_units");
  });

  it("acrescenta unidade e retorno como colunas opcionais, sem quebrar agendamentos antigos", () => {
    expect(unitsSql).toMatch(/add column unit_id text references public\.clinic_units \(id\)/i);
    expect(unitsSql).toMatch(
      /add column return_of_appointment_id text references public\.appointments \(id\)/i,
    );
    expect(unitsSql).not.toMatch(/unit_id text not null/i);
    expect(unitsSql).not.toMatch(/return_of_appointment_id text not null/i);
  });

  it("impede que um agendamento seja retorno de si mesmo", () => {
    expect(unitsSql).toMatch(
      /check \(return_of_appointment_id is null or return_of_appointment_id <> id\)/i,
    );
  });

  it("define search_path na trigger function de updated_at", () => {
    expect(unitsSql).toMatch(
      /function public\.set_clinic_units_updated_at\(\)[\s\S]*?set search_path = public/i,
    );
  });
});

describe("migration duplicate_booking_checks", () => {
  it.each(["duplicate_booking_checks", "duplicate_booking_check_appointments"])(
    "cria %s com RLS, deny para anon/authenticated e GRANT ao service_role",
    (table) => {
      expect(checksSql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
      expectDenyPolicies(checksSql, table);
      expectServiceRoleGrant(checksSql, table);
    },
  );

  it("cria o enum de status com GRANT ao service_role", () => {
    expect(checksSql).toMatch(
      /create type public\.duplicate_check_status as enum \(\s*'aguardando',\s*'resolvida'\s*\)/i,
    );
    expect(checksSql).toMatch(
      /grant\s+usage\s+on\s+type\s+public\.duplicate_check_status\s+to\s+service_role/i,
    );
  });

  it("checks: resolvida sempre com horário mantido e data, e resolução depois do envio", () => {
    expect(checksSql).toMatch(
      /check \(\(status = 'resolvida'\) = \(kept_appointment_id is not null\)\)/i,
    );
    expect(checksSql).toMatch(/check \(\(status = 'resolvida'\) = \(resolved_at is not null\)\)/i);
    expect(checksSql).toMatch(/check \(resolved_at is null or resolved_at >= sent_at\)/i);
  });

  it("uma confirmação aguardando por grupo de horários (índice único parcial)", () => {
    expect(checksSql).toMatch(
      /create unique index duplicate_booking_checks_one_open_per_group\s+on public\.duplicate_booking_checks \(group_key\)\s+where status = 'aguardando'/i,
    );
  });

  it("liga os itens à confirmação (cascade) e aos agendamentos, sem repetir horário", () => {
    expect(checksSql).toMatch(
      /check_id text not null references public\.duplicate_booking_checks \(id\) on delete cascade/i,
    );
    expect(checksSql).toMatch(
      /appointment_id text not null references public\.appointments \(id\)/i,
    );
    expect(checksSql).toMatch(/primary key \(check_id, appointment_id\)/i);
  });

  it("define search_path na trigger function de updated_at", () => {
    expect(checksSql).toMatch(
      /function public\.set_duplicate_booking_checks_updated_at\(\)[\s\S]*?set search_path = public/i,
    );
  });
});
