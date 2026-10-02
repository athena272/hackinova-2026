import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { AppointmentNotFoundError } from "./errors";
import { appointmentSelect } from "./mappers";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";

const record = {
  id: "apt-001",
  patientName: "Ana Souza",
  specialty: "Neurologia",
  scheduledAt: new Date("2026-09-22T12:00:00.000Z"),
  status: "pendente" as const,
  phoneMasked: "(79) 9****-1234",
};

const notFound = new Prisma.PrismaClientKnownRequestError("Record not found", {
  code: "P2025",
  clientVersion: "7.10.0",
});

function setup() {
  const appointment = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const repo = new PrismaAppointmentRepository(() => ({ appointment }) as never);
  return { appointment, repo };
}

describe("PrismaAppointmentRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista ordenando por data e converte scheduledAt para ISO", async () => {
    const { appointment, repo } = setup();
    appointment.findMany.mockResolvedValue([record]);

    await expect(repo.list()).resolves.toEqual([
      { ...record, scheduledAt: "2026-09-22T12:00:00.000Z" },
    ]);
    expect(appointment.findMany).toHaveBeenCalledWith({
      select: appointmentSelect,
      orderBy: { scheduledAt: "asc" },
    });
  });

  it("propaga falha de listagem com contexto legível", async () => {
    const { appointment, repo } = setup();
    appointment.findMany.mockRejectedValue(
      new Error("Can't reach database server"),
    );

    await expect(repo.list()).rejects.toThrow(
      "Falha ao listar agendamentos: Can't reach database server",
    );
  });

  it("getById retorna null quando o agendamento não existe", async () => {
    const { appointment, repo } = setup();
    appointment.findUnique.mockResolvedValue(null);

    await expect(repo.getById("apt-999")).resolves.toBeNull();
    expect(appointment.findUnique).toHaveBeenCalledWith({
      where: { id: "apt-999" },
      select: appointmentSelect,
    });
  });

  it("confirm aplica a regra de domínio e grava o novo status", async () => {
    const { appointment, repo } = setup();
    appointment.findUnique.mockResolvedValue(record);
    appointment.update.mockResolvedValue({ ...record, status: "confirmado" });

    const result = await repo.confirm("apt-001", "SIM");

    expect(result.status).toBe("confirmado");
    expect(appointment.update).toHaveBeenCalledWith({
      where: { id: "apt-001" },
      data: { status: "confirmado" },
      select: appointmentSelect,
    });
  });

  it("confirm lança AppointmentNotFoundError sem tentar atualizar", async () => {
    const { appointment, repo } = setup();
    appointment.findUnique.mockResolvedValue(null);

    await expect(repo.confirm("apt-999", "SIM")).rejects.toBeInstanceOf(
      AppointmentNotFoundError,
    );
    expect(appointment.update).not.toHaveBeenCalled();
  });

  it("saveOffered grava paciente, telefone e status da vaga", async () => {
    const { appointment, repo } = setup();
    const offered = {
      ...record,
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-4444",
      status: "confirmado" as const,
    };
    appointment.update.mockResolvedValue(offered);

    await repo.saveOffered({
      ...offered,
      scheduledAt: "2026-09-22T12:00:00.000Z",
    });

    expect(appointment.update).toHaveBeenCalledWith({
      where: { id: "apt-001" },
      data: {
        patientName: "Helena Dias",
        phoneMasked: "(79) 9****-4444",
        status: "confirmado",
      },
      select: appointmentSelect,
    });
  });

  it("saveOffered converte P2025 em AppointmentNotFoundError", async () => {
    const { appointment, repo } = setup();
    appointment.update.mockRejectedValue(notFound);

    await expect(
      repo.saveOffered({ ...record, scheduledAt: "2026-09-22T12:00:00.000Z" }),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
  });

  it("saveOffered propaga outros erros com contexto", async () => {
    const { appointment, repo } = setup();
    appointment.update.mockRejectedValue(new Error("timeout"));

    await expect(
      repo.saveOffered({ ...record, scheduledAt: "2026-09-22T12:00:00.000Z" }),
    ).rejects.toThrow("Falha ao oferecer vaga: timeout");
  });
});
