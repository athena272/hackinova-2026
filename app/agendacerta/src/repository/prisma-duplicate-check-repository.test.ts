import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  booking,
  openCheck,
  RESOLVED_AT,
  resolvedCheck,
  SENT_AT,
  september,
} from "@/domain/duplicate-booking/duplicate-booking.test-utils";
import { Prisma } from "@/generated/prisma/client";
import { DuplicateCheckConflictError } from "./errors";
import { duplicateCheckSelect } from "./mappers";
import { PrismaDuplicateCheckRepository } from "./prisma-duplicate-check-repository";

const openRecord = {
  id: "dup-1",
  patientId: "pat-bruno",
  groupKey: "apt-a,apt-b",
  status: "aguardando" as const,
  keptAppointmentId: null,
  sentAt: new Date(SENT_AT),
  resolvedAt: null,
  items: [{ appointmentId: "apt-a" }, { appointmentId: "apt-b" }],
};

const resolvedRecord = {
  ...openRecord,
  status: "resolvida" as const,
  keptAppointmentId: "apt-a",
  resolvedAt: new Date(RESOLVED_AT),
};

const uniqueViolation = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
  code: "P2002",
  clientVersion: "7.10.0",
});

const resolution = {
  check: resolvedCheck(),
  kept: booking({ id: "apt-a", status: "confirmado" }),
  released: [booking({ id: "apt-b", scheduledAt: september(24), status: "liberado" })],
};

function setup() {
  const duplicateBookingCheck = { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() };
  const tx = {
    duplicateBookingCheck: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(resolvedRecord),
    },
    appointment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  const $transaction = vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx));
  const repo = new PrismaDuplicateCheckRepository(
    () => ({ duplicateBookingCheck, $transaction }) as never,
  );
  return { duplicateBookingCheck, tx, $transaction, repo };
}

describe("PrismaDuplicateCheckRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list ordena por envio e devolve confirmações abertas e resolvidas no formato do domínio", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.findMany.mockResolvedValue([openRecord, resolvedRecord]);

    await expect(repo.list()).resolves.toEqual([openCheck(), resolvedCheck()]);
    expect(duplicateBookingCheck.findMany).toHaveBeenCalledWith({
      select: duplicateCheckSelect,
      orderBy: [{ sentAt: "asc" }, { id: "asc" }],
    });
  });

  it("recusa confirmação resolvida sem horário mantido vinda do banco", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.findMany.mockResolvedValue([{ ...resolvedRecord, keptAppointmentId: null }]);

    await expect(repo.list()).rejects.toThrow("Confirmação resolvida sem horário mantido");
  });

  it("getById devolve a confirmação ou null", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.findUnique.mockResolvedValueOnce(openRecord).mockResolvedValueOnce(null);

    await expect(repo.getById("dup-1")).resolves.toEqual(openCheck());
    await expect(repo.getById("dup-x")).resolves.toBeNull();
  });

  it("create grava a confirmação e os horários de uma vez", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.create.mockResolvedValue(openRecord);

    await expect(repo.create(openCheck())).resolves.toEqual(openCheck());
    expect(duplicateBookingCheck.create).toHaveBeenCalledWith({
      data: {
        id: "dup-1",
        patientId: "pat-bruno",
        groupKey: "apt-a,apt-b",
        status: "aguardando",
        sentAt: SENT_AT,
        items: { create: [{ appointmentId: "apt-a" }, { appointmentId: "apt-b" }] },
      },
      select: duplicateCheckSelect,
    });
  });

  it("create transforma o índice único parcial em conflito tipado", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.create.mockRejectedValue(uniqueViolation);

    await expect(repo.create(openCheck())).rejects.toBeInstanceOf(DuplicateCheckConflictError);
  });

  it("create propaga outras falhas com contexto legível", async () => {
    const { duplicateBookingCheck, repo } = setup();
    duplicateBookingCheck.create.mockRejectedValue(new Error("Can't reach database server"));

    await expect(repo.create(openCheck())).rejects.toThrow(
      "Falha ao enviar confirmação reforçada: Can't reach database server",
    );
  });

  it("resolve fecha a confirmação, confirma o mantido e libera os outros na mesma transação", async () => {
    const { tx, $transaction, repo } = setup();

    await expect(repo.resolve(resolution)).resolves.toEqual(resolvedCheck());
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(tx.duplicateBookingCheck.updateMany).toHaveBeenCalledWith({
      where: { id: "dup-1", status: "aguardando" },
      data: { status: "resolvida", keptAppointmentId: "apt-a", resolvedAt: RESOLVED_AT },
    });
    expect(tx.appointment.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "apt-a", status: { in: ["pendente", "confirmado"] } },
      data: { status: "confirmado" },
    });
    expect(tx.appointment.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: { in: ["apt-b"] }, status: { in: ["pendente", "confirmado"] } },
      data: { status: "liberado" },
    });
  });

  it("resolve vira conflito quando a confirmação já foi respondida", async () => {
    const { tx, repo } = setup();
    tx.duplicateBookingCheck.updateMany.mockResolvedValue({ count: 0 });

    await expect(repo.resolve(resolution)).rejects.toBeInstanceOf(DuplicateCheckConflictError);
    expect(tx.appointment.updateMany).not.toHaveBeenCalled();
  });

  it("resolve vira conflito quando o horário mantido deixou de estar ativo", async () => {
    const { tx, repo } = setup();
    tx.appointment.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(repo.resolve(resolution)).rejects.toBeInstanceOf(DuplicateCheckConflictError);
  });

  it("resolve vira conflito quando algum horário descartado mudou nesse meio tempo", async () => {
    const { tx, repo } = setup();
    tx.appointment.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repo.resolve(resolution)).rejects.toBeInstanceOf(DuplicateCheckConflictError);
  });

  it("resolve propaga outras falhas com contexto legível", async () => {
    const { $transaction, repo } = setup();
    $transaction.mockRejectedValue(new Error("Can't reach database server"));

    await expect(repo.resolve(resolution)).rejects.toThrow(
      "Falha ao registrar a escolha do paciente: Can't reach database server",
    );
  });
});
