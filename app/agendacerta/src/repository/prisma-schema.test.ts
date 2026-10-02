import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@/domain/appointment";
import type { WaitlistStatus } from "@/domain/waitlist";
import { appointment_status, waitlist_status } from "@/generated/prisma/enums";
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
};
const DOMAIN_WAITLIST_STATUSES: Record<WaitlistStatus, true> = {
  aguardando: true,
  atribuido: true,
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

const migrationEnums = new Map(
  Array.from(
    migrations.matchAll(/create type public\.(\w+) as enum \(([\s\S]*?)\);/gi),
    ([, name, values]) => [name, Array.from(values.matchAll(/'([^']+)'/g), ([, v]) => v)],
  ),
);

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

  it("mapeia os models do domínio para appointments e waitlist", () => {
    expect(schemaTables.get("appointments")).toBe("Appointment");
    expect(schemaTables.get("waitlist")).toBe("WaitlistEntry");
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
});
