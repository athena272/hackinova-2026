import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Garante que as migrations de appointments concedem privilégios ao service_role.
 * Regressão: sem isso a Vercel/Data API responde "permission denied for table appointments".
 */
describe("migrations appointments (grants)", () => {
  const migrationsDir = join(process.cwd(), "../../supabase/migrations");

  it("inclui GRANT ao service_role na migration inicial", () => {
    const sql = readFileSync(
      join(migrationsDir, "20260920081658_create_appointments.sql"),
      "utf8",
    );

    expect(sql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.appointments\s+to\s+service_role/i,
    );
    expect(sql).toMatch(
      /grant\s+usage\s+on\s+type\s+public\.appointment_status\s+to\s+service_role/i,
    );
  });

  it("inclui migration dedicada de GRANT para bancos já migrados", () => {
    const sql = readFileSync(
      join(migrationsDir, "20260920092600_appointments_grant_service_role.sql"),
      "utf8",
    );

    expect(sql).toMatch(
      /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.appointments\s+to\s+service_role/i,
    );
  });
});
