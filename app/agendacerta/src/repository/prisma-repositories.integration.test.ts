import { existsSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { scoreAppointmentsRisk } from "@/application/score-appointments-risk";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import { getPrisma } from "@/lib/database/prisma";
import { InMemoryExamPreparationRepository } from "./in-memory-exam-preparation-repository";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";
import { PrismaExamPreparationRepository } from "./prisma-exam-preparation-repository";
import { PrismaPatientRepository } from "./prisma-patient-repository";
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
  const patients = new PrismaPatientRepository();
  const preparations = new PrismaExamPreparationRepository();

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

  it("monta paciente e procedimento pelo join com patients", async () => {
    const list = await appointments.list();

    for (const item of list) {
      expect(item.patientId).toMatch(/^pat-/);
      expect(item.patientName.trim()).not.toBe("");
      expect(item.phoneMasked).toMatch(/\*{4}/);
      if (item.procedure.type === "exame") {
        expect(item.procedure.examName.trim()).not.toBe("");
      }
    }
    expect(list.some((item) => item.status === "faltou")).toBe(true);
    expect(list.find((item) => item.id === "apt-004")?.procedure).toEqual({
      type: "exame",
      examName: "Ultrassonografia de abdome total",
    });
  });

  it("lista de espera traz só quem aguarda na especialidade, por id", async () => {
    const entries = await waitlist.listBySpecialty("Neurologia");

    const ids = entries.map((entry) => entry.id);
    expect(ids).toEqual([...ids].sort());
    for (const entry of entries) {
      expect(entry).toMatchObject({ specialty: "Neurologia", status: "aguardando" });
    }
  });

  it("toda consulta tem bookedAt em ISO, nunca depois do horário", async () => {
    const list = await appointments.list();

    for (const item of list) {
      expect(new Date(item.bookedAt).toISOString(), item.id).toBe(item.bookedAt);
      expect(Date.parse(item.bookedAt), item.id).toBeLessThanOrEqual(
        Date.parse(item.scheduledAt),
      );
    }
  });

  it("devolve bairros com coordenadas numéricas e o bairro da clínica", async () => {
    const locations = await patients.listLocations();
    const clinic = await patients.getNeighborhood(CLINIC_NEIGHBORHOOD_ID);

    expect(locations.length).toBeGreaterThan(0);
    for (const { neighborhood } of locations) {
      if (neighborhood) {
        expect(typeof neighborhood.latitude).toBe("number");
        expect(typeof neighborhood.longitude).toBe("number");
      }
    }
    expect(clinic).toMatchObject({ id: CLINIC_NEIGHBORHOOD_ID, latitude: -10.944 });
  });

  it("calcula o risco a partir do banco com os mesmos resultados do seed", async () => {
    const risks = await scoreAppointmentsRisk(appointments, patients);
    const bandById = Object.fromEntries(
      risks.map((risk) => [risk.appointmentId, risk.band]),
    );

    expect(bandById["apt-001"]).toBe("alto");
    expect(bandById["apt-002"]).toBe("baixo");
    expect(bandById["apt-006"]).toBeUndefined();
  });

  it("lista o cadastro de preparo com os itens na ordem do checklist, igual ao seed", async () => {
    const list = await preparations.list();

    expect(list).toEqual(await new InMemoryExamPreparationRepository().list());
    for (const preparation of list) {
      const positions = preparation.items.map((item) => item.position);
      expect(positions, preparation.id).toEqual([...positions].sort((a, b) => a - b));
    }
    await expect(preparations.findByExamName("Raio-X inexistente")).resolves.toBeNull();
  });

  it("monta a resposta de preparo gravada em ISO e deixa null quem não respondeu", async () => {
    const answered = await appointments.getById("apt-004");
    const unanswered = await appointments.getById("apt-008");

    expect(answered?.preparation).toEqual({
      result: "ok",
      missedItemIds: [],
      answeredAt: new Date("2026-09-22T18:00:00-03:00").toISOString(),
    });
    expect(unanswered?.preparation).toBeNull();
  });
});
