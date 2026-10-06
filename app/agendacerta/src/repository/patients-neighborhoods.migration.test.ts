import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Garante segurança e ordem do backfill nas migrations do cadastro de pacientes.
 * Regressões evitadas: tabela exposta à Data API sem RLS, permission denied
 * no service_role e perda de nome/telefone ao remover colunas antes do backfill.
 */
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const readMigration = (file: string) =>
  readFileSync(join(migrationsDir, file), "utf8");

const statusSql = readMigration("20261006120000_appointment_status_attendance.sql");
const patientsSql = readMigration("20261006120100_create_patients_and_neighborhoods.sql");
const seedSql = readMigration("20261006120200_seed_demo_patient_history.sql");

describe("migration de status de comparecimento", () => {
  it.each(["compareceu", "faltou"])("adiciona %s ao enum appointment_status", (value) => {
    expect(statusSql).toMatch(
      new RegExp(
        `alter type public\\.appointment_status add value if not exists '${value}'`,
        "i",
      ),
    );
  });

  it("fica separada do seed (valor novo de enum não pode ser usado na mesma transação)", () => {
    expect(statusSql).not.toMatch(/insert into/i);
    expect(seedSql).not.toMatch(/alter type/i);
  });
});

describe("migration patients e neighborhoods", () => {
  it.each(["patients", "neighborhoods"])("cria a tabela %s com RLS e deny para anon/authenticated", (table) => {
    expect(patientsSql).toMatch(new RegExp(`create table public\\.${table}`, "i"));
    expect(patientsSql).toMatch(
      new RegExp(`alter table public\\.${table} enable row level security`, "i"),
    );
    for (const role of ["anon", "authenticated"]) {
      expect(patientsSql).toMatch(
        new RegExp(
          `create policy "${table}_deny_${role}"\\s+on public\\.${table}\\s+for all\\s+to ${role}\\s+using \\(false\\)\\s+with check \\(false\\)`,
          "i",
        ),
      );
    }
  });

  it.each(["patients", "neighborhoods"])("concede GRANT ao service_role em %s", (table) => {
    expect(patientsSql).toMatch(
      new RegExp(
        `grant\\s+select,\\s*insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`,
        "i",
      ),
    );
  });

  it("concede uso do enum procedure_type ao service_role", () => {
    expect(patientsSql).toMatch(
      /grant\s+usage\s+on\s+type\s+public\.procedure_type\s+to\s+service_role/i,
    );
  });

  it.each(["patients", "neighborhoods"])("define search_path na trigger function de %s", (table) => {
    expect(patientsSql).toMatch(
      new RegExp(
        `function public\\.set_${table}_updated_at[\\s\\S]*?set search_path = public`,
        "i",
      ),
    );
  });

  it.each(["appointments", "waitlist"])("liga %s a patients por FK obrigatória", (table) => {
    expect(patientsSql).toMatch(
      new RegExp(
        `alter table public\\.${table}\\s+alter column patient_id set not null,\\s+add constraint ${table}_patient_id_fkey\\s+foreign key \\(patient_id\\) references public\\.patients \\(id\\)`,
        "i",
      ),
    );
  });

  it.each(["appointments", "waitlist"])(
    "só remove nome e telefone de %s depois do backfill",
    (table) => {
      const backfill = patientsSql.search(
        new RegExp(`update public\\.${table} as \\w+\\s+set patient_id`, "i"),
      );
      const drop = patientsSql.search(
        new RegExp(`alter table public\\.${table}\\s+drop column patient_name`, "i"),
      );

      expect(backfill).toBeGreaterThan(-1);
      expect(drop).toBeGreaterThan(backfill);
    },
  );

  it("exige nome do procedimento em exame e proíbe nome em branco", () => {
    expect(patientsSql).toMatch(
      /check \(\(procedure_type = 'exame'\) = \(procedure_name is not null\)\)/i,
    );
    expect(patientsSql).toMatch(
      /check \(procedure_name is null or btrim\(procedure_name\) <> ''\)/i,
    );
  });
});
