import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppointmentStatus, ProcedureType } from "@/domain/appointment";
import type { WaitlistStatus } from "@/domain/waitlist";
import {
  appointment_status,
  procedure_type,
  waitlist_status,
} from "@/generated/prisma/enums";
import { AUTH_TABLES } from "@/lib/auth/server";

/**
 * Regressão de divergência entre banco e código: o schema.prisma vem do
 * `pnpm db:pull` e precisa acompanhar as migrations do Supabase e o domínio.
 */

// Record força listar todos os status do domínio em tempo de compilação.
const DOMAIN_APPOINTMENT_STATUSES: Record<AppointmentStatus, true> = {
  pendente: true,
  confirmado: true,
  liberado: true,
  remarcacao_solicitada: true,
  compareceu: true,
  faltou: true,
};
const DOMAIN_WAITLIST_STATUSES: Record<WaitlistStatus, true> = {
  aguardando: true,
  atribuido: true,
};
const DOMAIN_PROCEDURE_TYPES: Record<ProcedureType, true> = {
  consulta: true,
  exame: true,
};

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migrationsDir = join(process.cwd(), "../../supabase/migrations");
const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
  .join("\n");

function blocks(source: string, keyword: "model" | "enum") {
  const pattern = new RegExp(`^${keyword} (\\w+) \\{([\\s\\S]*?)^\\}`, "gm");
  return Array.from(source.matchAll(pattern), ([, name, body]) => ({ name, body }));
}

/** Nome da tabela de cada model: @@map quando existe, senão o próprio nome. */
const schemaTables = new Map(
  blocks(schema, "model").map(({ name, body }) => [
    body.match(/@@map\("(\w+)"\)/)?.[1] ?? name,
    name,
  ]),
);

const schemaEnums = new Map(
  blocks(schema, "enum").map(({ name, body }) => [
    name,
    body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("//") && !line.startsWith("@@")),
  ]),
);

const migrationTables = Array.from(
  migrations.matchAll(/create table public\.(\w+)/gi),
  ([, table]) => table,
);

/** Valores de cada enum: os do `create type` mais os acrescentados por `alter type ... add value`. */
const migrationEnums = new Map(
  Array.from(
    migrations.matchAll(/create type public\.(\w+) as enum \(([\s\S]*?)\);/gi),
    ([, name, values]) => [name, Array.from(values.matchAll(/'([^']+)'/g), ([, v]) => v)],
  ),
);
for (const [, name, value] of migrations.matchAll(
  /alter type public\.(\w+) add value (?:if not exists )?'([^']+)'/gi,
)) {
  const values = migrationEnums.get(name);
  if (!values) {
    throw new Error(`alter type em enum inexistente nas migrations: ${name}`);
  }
  if (!values.includes(value)) values.push(value);
}

const sorted = (values: Iterable<string>) => Array.from(values).sort();

describe("prisma/schema.prisma", () => {
  it("tem um model para cada tabela criada nas migrations (rode pnpm db:pull)", () => {
    expect(sorted(schemaTables.keys())).toEqual(sorted(migrationTables));
  });

  it("tem os mesmos enums e valores das migrations", () => {
    expect(sorted(schemaEnums.keys())).toEqual(sorted(migrationEnums.keys()));
    for (const [name, values] of migrationEnums) {
      expect(schemaEnums.get(name), `enum ${name}`).toEqual(values);
    }
  });

  it("mapeia os models do domínio para appointments, waitlist, patients e neighborhoods", () => {
    expect(schemaTables.get("appointments")).toBe("Appointment");
    expect(schemaTables.get("waitlist")).toBe("WaitlistEntry");
    expect(schemaTables.get("patients")).toBe("Patient");
    expect(schemaTables.get("neighborhoods")).toBe("Neighborhood");
  });

  it("acrescenta compareceu e faltou ao enum de status via migration", () => {
    expect(migrationEnums.get("appointment_status")).toEqual(
      expect.arrayContaining(["compareceu", "faltou"]),
    );
  });

  it.each(Object.values(AUTH_TABLES))(
    "mantém o model %s com o nome da tabela (modelName do Better Auth)",
    (table) => {
      expect(schemaTables.get(table)).toBe(table);
    },
  );

  it("status de agendamento do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(appointment_status))).toEqual(
      sorted(Object.keys(DOMAIN_APPOINTMENT_STATUSES)),
    );
  });

  it("status da lista de espera do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(waitlist_status))).toEqual(
      sorted(Object.keys(DOMAIN_WAITLIST_STATUSES)),
    );
  });

  it("tipos de procedimento do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(procedure_type))).toEqual(
      sorted(Object.keys(DOMAIN_PROCEDURE_TYPES)),
    );
  });
});
