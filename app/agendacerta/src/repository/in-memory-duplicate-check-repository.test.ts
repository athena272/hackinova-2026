import { beforeEach, describe, expect, it } from "vitest";
import { openCheck, RESOLVED_AT, resolvedCheck, SENT_AT } from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import { DuplicateCheckConflictError } from "./errors";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "./in-memory-appointment-repository";
import {
  InMemoryDuplicateCheckRepository,
  resetDuplicateCheckStoreForTests,
} from "./in-memory-duplicate-check-repository";

/** Par do seed: Bruno Lima com Endocrinologia em duas unidades. */
const brunoCheck = openCheck({
  appointmentIds: ["apt-002", "apt-009"],
  groupKey: "apt-002,apt-009",
  patientId: "pat-6b7f76f9c9ca",
});

describe("InMemoryDuplicateCheckRepository", () => {
  const appointments = new InMemoryAppointmentRepository();
  const repo = new InMemoryDuplicateCheckRepository(appointments);

  beforeEach(() => {
    resetAppointmentStoreForTests();
    resetDuplicateCheckStoreForTests();
  });

  it("guarda a confirmação e devolve cópias em ordem de envio", async () => {
    await repo.create(openCheck({ id: "dup-2", groupKey: "x,y", sentAt: "2026-09-21T15:00:00.000Z" }));
    const created = await repo.create(openCheck());
    created.appointmentIds.push("alterado");

    expect((await repo.list()).map(({ id }) => id)).toEqual(["dup-1", "dup-2"]);
    expect((await repo.getById("dup-1"))?.appointmentIds).toEqual(["apt-a", "apt-b"]);
    await expect(repo.getById("dup-x")).resolves.toBeNull();
  });

  it("recusa id repetido e segunda confirmação aguardando do mesmo grupo, como o banco", async () => {
    await repo.create(openCheck());

    await expect(repo.create(openCheck())).rejects.toBeInstanceOf(DuplicateCheckConflictError);
    await expect(repo.create(openCheck({ id: "dup-2" }))).rejects.toBeInstanceOf(
      DuplicateCheckConflictError,
    );
  });

  it("aceita confirmação nova do mesmo grupo depois que a anterior foi resolvida", async () => {
    await repo.create(brunoCheck);
    const kept = (await appointments.getById("apt-002"))!;
    const discarded = (await appointments.getById("apt-009"))!;
    await repo.resolve({
      check: { ...brunoCheck, status: "resolvida", keptAppointmentId: "apt-002", resolvedAt: RESOLVED_AT },
      kept: { ...kept, status: "confirmado" },
      released: [{ ...discarded, status: "liberado" }],
    });

    await expect(repo.create({ ...brunoCheck, id: "dup-2", sentAt: SENT_AT })).resolves.toMatchObject({
      id: "dup-2",
      status: "aguardando",
    });
  });

  it("resolve confirma o mantido, libera o descartado e fecha a confirmação", async () => {
    await repo.create(brunoCheck);
    const kept = (await appointments.getById("apt-002"))!;
    const discarded = (await appointments.getById("apt-009"))!;

    const resolved = await repo.resolve({
      check: { ...brunoCheck, status: "resolvida", keptAppointmentId: "apt-002", resolvedAt: RESOLVED_AT },
      kept: { ...kept, status: "confirmado" },
      released: [{ ...discarded, status: "liberado" }],
    });

    expect(resolved.status).toBe("resolvida");
    expect((await appointments.getById("apt-002"))?.status).toBe("confirmado");
    expect((await appointments.getById("apt-009"))?.status).toBe("liberado");
    expect((await repo.getById(brunoCheck.id))?.status).toBe("resolvida");
  });

  it("resolve sem gravar nada quando a confirmação não está aguardando", async () => {
    const kept = (await appointments.getById("apt-002"))!;

    await expect(
      repo.resolve({ check: resolvedCheck(), kept: { ...kept, status: "confirmado" }, released: [] }),
    ).rejects.toBeInstanceOf(DuplicateCheckConflictError);
    expect((await appointments.getById("apt-002"))?.status).toBe("pendente");
  });

  it("resolve sem gravar nada quando um horário já não está ativo", async () => {
    await repo.create(brunoCheck);
    const kept = (await appointments.getById("apt-002"))!;
    const discarded = (await appointments.getById("apt-009"))!;
    await appointments.confirm("apt-009", "NAO");

    await expect(
      repo.resolve({
        check: { ...brunoCheck, status: "resolvida", keptAppointmentId: "apt-002", resolvedAt: RESOLVED_AT },
        kept: { ...kept, status: "confirmado" },
        released: [{ ...discarded, status: "liberado" }],
      }),
    ).rejects.toBeInstanceOf(DuplicateCheckConflictError);
    expect((await appointments.getById("apt-002"))?.status).toBe("pendente");
    expect((await repo.getById(brunoCheck.id))?.status).toBe("aguardando");
  });
});
