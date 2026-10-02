import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { getPrisma } from "@/lib/database/prisma";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";
import { PrismaWaitlistRepository } from "./prisma-waitlist-repository";

/**
 * Integração com o Postgres do Supabase local (somente leitura).
 * PowerShell: npx supabase start; $env:RUN_DB_TESTS="1"; pnpm test
 */
const runDbTests = process.env.RUN_DB_TESTS === "1";

if (runDbTests && !process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

describe.runIf(runDbTests)("repositórios Prisma no Postgres local", () => {
  const appointments = new PrismaAppointmentRepository();
  const waitlist = new PrismaWaitlistRepository();

  afterAll(async () => {
    await getPrisma().$disconnect();
  });

  it("lista agendamentos ordenados por data com scheduledAt em ISO", async () => {
    const list = await appointments.list();

    expect(list.length).toBeGreaterThan(0);
    const dates = list.map((item) => item.scheduledAt);
    expect(dates).toEqual([...dates].sort());
    for (const date of dates) {
      expect(new Date(date).toISOString()).toBe(date);
    }
  });

  it("busca agendamento por id e devolve null para id inexistente", async () => {
    const [first] = await appointments.list();

    await expect(appointments.getById(first.id)).resolves.toEqual(first);
    await expect(appointments.getById("apt-inexistente")).resolves.toBeNull();
  });

  it("lista de espera traz só quem aguarda na especialidade, por id", async () => {
    const entries = await waitlist.listBySpecialty("Neurologia");

    const ids = entries.map((entry) => entry.id);
    expect(ids).toEqual([...ids].sort());
    for (const entry of entries) {
      expect(entry).toMatchObject({ specialty: "Neurologia", status: "aguardando" });
    }
  });
});
