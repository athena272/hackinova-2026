import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  accepted,
  appointment,
  refused,
  waitingCandidate,
} from "@/domain/overbooking/overbooking.test-utils";
import { Prisma } from "@/generated/prisma/client";
import { OverbookingConflictError } from "./errors";
import { overbookingSelect } from "./mappers";
import { PrismaOverbookingRepository } from "./prisma-overbooking-repository";

const acceptedRecord = {
  id: "ovb-1",
  anchorAppointmentId: "apt-001",
  specialty: "Neurologia",
  scheduledAt: new Date("2026-09-22T12:00:00.000Z"),
  decision: "aceita" as const,
  sequence: 1,
  encaixeAppointmentId: "apt-enc-1",
  riskProbability: 64,
  decidedAt: new Date("2026-09-20T12:00:00.000Z"),
};

const refusedRecord = {
  ...acceptedRecord,
  id: "ovb-2",
  decision: "recusada" as const,
  sequence: null,
  encaixeAppointmentId: null,
};

const uniqueViolation = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
  code: "P2002",
  clientVersion: "7.10.0",
});

const encaixe = {
  appointment: appointment({
    id: "apt-enc-1",
    patientId: "pat-helena",
    patientName: "Helena Dias",
    bookedAt: "2026-09-20T12:00:00.000Z",
  }),
  candidate: { ...waitingCandidate(), status: "atribuido" as const },
  overbooking: accepted(),
};

function setup() {
  const overbooking = { findMany: vi.fn(), create: vi.fn() };
  const tx = {
    appointment: { create: vi.fn() },
    waitlistEntry: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    overbooking: { create: vi.fn().mockResolvedValue(acceptedRecord) },
  };
  const $transaction = vi.fn(async (run: (client: typeof tx) => Promise<unknown>) => run(tx));
  const repo = new PrismaOverbookingRepository(() => ({ overbooking, $transaction }) as never);
  return { overbooking, tx, $transaction, repo };
}

describe("PrismaOverbookingRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list ordena por horário e devolve aceites e recusas no formato do domínio", async () => {
    const { overbooking, repo } = setup();
    overbooking.findMany.mockResolvedValue([acceptedRecord, refusedRecord]);

    await expect(repo.list()).resolves.toEqual([accepted(), refused()]);
    expect(overbooking.findMany).toHaveBeenCalledWith({
      select: overbookingSelect,
      orderBy: [{ scheduledAt: "asc" }, { decidedAt: "asc" }, { id: "asc" }],
    });
  });

  it("recusa aceite sem número vindo do banco em vez de devolver dado inconsistente", async () => {
    const { overbooking, repo } = setup();
    overbooking.findMany.mockResolvedValue([{ ...acceptedRecord, sequence: null }]);

    await expect(repo.list()).rejects.toThrow(/sem número ou agendamento/);
  });

  it("saveAcceptance cria o encaixe, atribui o candidato e grava a decisão numa transação", async () => {
    const { tx, $transaction, repo } = setup();

    await expect(repo.saveAcceptance(encaixe)).resolves.toEqual(accepted());
    expect($transaction).toHaveBeenCalledOnce();
    expect(tx.appointment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "apt-enc-1",
        patientId: "pat-helena",
        scheduledAt: "2026-09-22T12:00:00.000Z",
        status: "pendente",
        procedureType: "consulta",
        procedureName: null,
      }),
    });
    expect(tx.waitlistEntry.updateMany).toHaveBeenCalledWith({
      where: { id: "wl-001", status: "aguardando" },
      data: { status: "atribuido" },
    });
    expect(tx.overbooking.create).toHaveBeenCalledWith({
      data: {
        id: "ovb-1",
        anchorAppointmentId: "apt-001",
        specialty: "Neurologia",
        scheduledAt: "2026-09-22T12:00:00.000Z",
        decision: "aceita",
        sequence: 1,
        encaixeAppointmentId: "apt-enc-1",
        riskProbability: 64,
        decidedAt: "2026-09-20T12:00:00.000Z",
      },
      select: overbookingSelect,
    });
  });

  it("saveAcceptance desfaz tudo quando o candidato já não está aguardando", async () => {
    const { tx, repo } = setup();
    tx.waitlistEntry.updateMany.mockResolvedValue({ count: 0 });

    await expect(repo.saveAcceptance(encaixe)).rejects.toBeInstanceOf(OverbookingConflictError);
    expect(tx.overbooking.create).not.toHaveBeenCalled();
  });

  it("saveAcceptance converte P2002 (mesmo número no bloco) em OverbookingConflictError", async () => {
    const { tx, repo } = setup();
    tx.overbooking.create.mockRejectedValue(uniqueViolation);

    await expect(repo.saveAcceptance(encaixe)).rejects.toBeInstanceOf(OverbookingConflictError);
  });

  it("saveAcceptance propaga outras falhas com contexto legível", async () => {
    const { tx, repo } = setup();
    tx.appointment.create.mockRejectedValue(new Error("violates foreign key"));

    await expect(repo.saveAcceptance(encaixe)).rejects.toThrow(
      "Falha ao registrar encaixe: violates foreign key",
    );
  });

  it("saveRefusal grava a recusa sem encaixe e converte P2002 em conflito", async () => {
    const { overbooking, repo } = setup();
    overbooking.create.mockResolvedValueOnce(refusedRecord).mockRejectedValueOnce(uniqueViolation);

    await expect(repo.saveRefusal(refused())).resolves.toEqual(refused());
    expect(overbooking.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ decision: "recusada", sequence: null, encaixeAppointmentId: null }),
      select: overbookingSelect,
    });
    await expect(repo.saveRefusal(refused())).rejects.toBeInstanceOf(OverbookingConflictError);
  });

  it("saveRefusal propaga outras falhas com contexto legível", async () => {
    const { overbooking, repo } = setup();
    overbooking.create.mockRejectedValue(new Error("timeout"));

    await expect(repo.saveRefusal(refused())).rejects.toThrow(
      "Falha ao registrar recusa de encaixe: timeout",
    );
  });
});
