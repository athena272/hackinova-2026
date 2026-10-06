import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * booked_at é a base do fator antecedência. Regressões evitadas: coluna nula
 * em linha antiga (NOT NULL falharia na nuvem) e marcação depois da consulta.
 */
const sql = readFileSync(
  join(process.cwd(), "../../supabase/migrations/20261006130000_appointments_booked_at.sql"),
  "utf8",
);

describe("migration booked_at", () => {
  it("adiciona a coluna como timestamptz", () => {
    expect(sql).toMatch(/alter table public\.appointments add column booked_at timestamptz/i);
  });

  it("preenche todas as linhas antes de exigir NOT NULL", () => {
    const fillRemaining = sql.search(/set booked_at = least\(created_at, scheduled_at\)\s+where booked_at is null/i);
    const notNull = sql.search(/alter column booked_at set not null/i);

    expect(fillRemaining).toBeGreaterThan(-1);
    expect(notNull).toBeGreaterThan(fillRemaining);
  });

  it("garante no banco que a marcação não passa do horário da consulta", () => {
    expect(sql).toMatch(
      /add constraint appointments_booked_at_before_scheduled\s+check \(booked_at <= scheduled_at\)/i,
    );
  });

  it("usa now() como padrão para novas consultas", () => {
    expect(sql).toMatch(/alter column booked_at set default now\(\)/i);
  });
});
