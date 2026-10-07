import { beforeEach, describe, expect, it } from "vitest";
import { accepted, refused } from "@/domain/overbooking/overbooking.test-utils";
import type { CreateEncaixeResult } from "@/domain/overbooking";
import { OverbookingConflictError } from "./errors";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "./in-memory-appointment-repository";
import {
  InMemoryOverbookingRepository,
  resetOverbookingStoreForTests,
} from "./in-memory-overbooking-repository";
import {
  InMemoryWaitlistRepository,
  resetWaitlistStoreForTests,
} from "./in-memory-waitlist-repository";

const appointments = new InMemoryAppointmentRepository();
const waitlist = new InMemoryWaitlistRepository();

async function encaixeFor(waitlistId: string, overrides: Partial<CreateEncaixeResult["overbooking"]> = {}) {
  const anchor = (await appointments.getById("apt-001"))!;
  const candidate = (await waitlist.getById(waitlistId))!;
  const overbooking = accepted({
    scheduledAt: anchor.scheduledAt,
    encaixeAppointmentId: `apt-enc-${waitlistId}`,
    ...overrides,
  });
  return {
    appointment: {
      ...anchor,
      id: overbooking.encaixeAppointmentId,
      patientId: candidate.patientId,
      patientName: candidate.patientName,
    },
    candidate: { ...candidate, status: "atribuido" as const },
    overbooking,
  } satisfies CreateEncaixeResult;
}

describe("InMemoryOverbookingRepository", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetWaitlistStoreForTests();
    resetOverbookingStoreForTests();
  });

  it("começa vazio", async () => {
    await expect(new InMemoryOverbookingRepository().list()).resolves.toEqual([]);
  });

  it("saveAcceptance grava o encaixe na agenda, atribui o candidato e lista a decisão", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    const encaixe = await encaixeFor("wl-001");

    await expect(repo.saveAcceptance(encaixe)).resolves.toEqual(encaixe.overbooking);
    expect(await appointments.getById("apt-enc-wl-001")).toMatchObject({ patientName: "Helena Dias" });
    expect((await waitlist.getById("wl-001"))?.status).toBe("atribuido");
    await expect(repo.list()).resolves.toEqual([encaixe.overbooking]);
  });

  it("reproduz o índice do número do encaixe por bloco sem gravar nada pela metade", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    await repo.saveAcceptance(await encaixeFor("wl-001"));
    const second = await encaixeFor("wl-004", { id: "ovb-9" });

    await expect(repo.saveAcceptance(second)).rejects.toBeInstanceOf(OverbookingConflictError);
    expect(await appointments.getById("apt-enc-wl-004")).toBeNull();
    expect((await waitlist.getById("wl-004"))?.status).toBe("aguardando");
  });

  it("recusa candidato que já foi atribuído", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    const encaixe = await encaixeFor("wl-001");
    await waitlist.saveAssigned(encaixe.candidate);

    await expect(repo.saveAcceptance(encaixe)).rejects.toBeInstanceOf(OverbookingConflictError);
    expect(await appointments.getById("apt-enc-wl-001")).toBeNull();
  });

  it("aceita outro número no mesmo bloco e o mesmo número em outro bloco", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    await repo.saveAcceptance(await encaixeFor("wl-001"));

    await expect(
      repo.saveAcceptance(await encaixeFor("wl-004", { id: "ovb-9", sequence: 2 })),
    ).resolves.toMatchObject({ sequence: 2 });
  });

  it("uma recusa por bloco, comparando o instante do horário", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    await repo.saveRefusal(refused());

    await expect(
      repo.saveRefusal(refused({ id: "ovb-3", scheduledAt: "2026-09-22T09:00:00-03:00" })),
    ).rejects.toBeInstanceOf(OverbookingConflictError);
    await expect(
      repo.saveRefusal(refused({ id: "ovb-4", specialty: "Oftalmologia" })),
    ).resolves.toMatchObject({ id: "ovb-4" });
  });

  it("devolve cópias, para quem chama não alterar o store", async () => {
    const repo = new InMemoryOverbookingRepository(appointments, waitlist);
    await repo.saveRefusal(refused());

    const [first] = await repo.list();
    first.riskProbability = 0;
    expect((await repo.list())[0].riskProbability).toBe(64);
  });
});
