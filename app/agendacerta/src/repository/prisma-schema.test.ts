import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AppointmentStatus, ProcedureType } from "@/domain/appointment";
import type { DuplicateCheckStatus } from "@/domain/duplicate-booking";
import type { OverbookingDecision } from "@/domain/overbooking";
import type { SlotOfferStatus } from "@/domain/slot-offer";
import type { WaitlistStatus } from "@/domain/waitlist";
import {
  appointment_status,
  duplicate_check_status,
  overbooking_decision,
  procedure_type,
  slot_offer_status,
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
const DOMAIN_SLOT_OFFER_STATUSES: Record<SlotOfferStatus, true> = {
  pendente: true,
  aceita: true,
  recusada: true,
  expirada: true,
};
const DOMAIN_OVERBOOKING_DECISIONS: Record<OverbookingDecision, true> = {
  aceita: true,
  recusada: true,
};
const DOMAIN_DUPLICATE_CHECK_STATUSES: Record<DuplicateCheckStatus, true> = {
  aguardando: true,
  resolvida: true,
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

  it("SlotOffer é 1:N com vaga e candidato (índices únicos parciais ficam só na migration)", () => {
    const models = new Map(blocks(schema, "model").map(({ name, body }) => [name, body]));

    expect(schemaTables.get("slot_offers")).toBe("SlotOffer");
    expect(models.get("SlotOffer")).not.toMatch(/@unique/);
    expect(models.get("Appointment")).toMatch(/slotOffers\s+SlotOffer\[\]/);
    expect(models.get("WaitlistEntry")).toMatch(/slotOffers\s+SlotOffer\[\]/);
    expect(migrations).toMatch(/create unique index slot_offers_one_pending_per_appointment/i);
  });

  it("Overbooking tem âncora 1:N e encaixe 1:1 com Appointment, sem os índices parciais no schema", () => {
    const models = new Map(blocks(schema, "model").map(({ name, body }) => [name, body]));
    const overbooking = models.get("Overbooking");

    expect(schemaTables.get("overbookings")).toBe("Overbooking");
    expect(overbooking).toMatch(/encaixeAppointmentId\s+String\?\s+@unique/);
    expect(overbooking).not.toMatch(/@@unique|where:/);
    expect(models.get("Appointment")).toMatch(/anchoredOverbookings\s+Overbooking\[\]\s+@relation\("OverbookingAnchor"\)/);
    expect(models.get("Appointment")).toMatch(/encaixeOverbooking\s+Overbooking\?\s+@relation\("OverbookingEncaixe"\)/);
    expect(schema).not.toMatch(/previewFeatures/);
    expect(migrations).toMatch(/create unique index overbookings_sequence_per_block/i);
  });

  it("unidade e retorno são relações opcionais do agendamento; o índice parcial das confirmações fica só na migration", () => {
    const models = new Map(blocks(schema, "model").map(({ name, body }) => [name, body]));
    const appointment = models.get("Appointment");

    expect(schemaTables.get("clinic_units")).toBe("ClinicUnit");
    expect(schemaTables.get("duplicate_booking_checks")).toBe("DuplicateBookingCheck");
    expect(schemaTables.get("duplicate_booking_check_appointments")).toBe(
      "DuplicateBookingCheckAppointment",
    );
    expect(appointment).toMatch(/unitId\s+String\?\s+@map\("unit_id"\)/);
    expect(appointment).toMatch(/returnOfAppointmentId\s+String\?\s+@map\("return_of_appointment_id"\)/);
    expect(appointment).toMatch(/returnOf\s+Appointment\?\s+@relation\("AppointmentReturn"/);
    expect(models.get("DuplicateBookingCheck")).not.toMatch(/@unique|where:/);
    expect(migrations).toMatch(/create unique index duplicate_booking_checks_one_open_per_group/i);
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

  it("status da oferta de vaga do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(slot_offer_status))).toEqual(
      sorted(Object.keys(DOMAIN_SLOT_OFFER_STATUSES)),
    );
  });

  it("decisões do encaixe do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(overbooking_decision))).toEqual(
      sorted(Object.keys(DOMAIN_OVERBOOKING_DECISIONS)),
    );
  });

  it("status da confirmação reforçada do domínio batem com o enum do banco", () => {
    expect(sorted(Object.values(duplicate_check_status))).toEqual(
      sorted(Object.keys(DOMAIN_DUPLICATE_CHECK_STATUSES)),
    );
  });
});
