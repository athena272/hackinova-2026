import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/domain/appointment";
import { Prisma } from "@/generated/prisma/client";
import { AppointmentNotFoundError } from "./errors";
import { appointmentSelect } from "./mappers";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";

const record = {
  id: "apt-001",
  specialty: "Neurologia",
  scheduledAt: new Date("2026-09-22T12:00:00.000Z"),
  bookedAt: new Date("2026-08-13T12:00:00.000Z"),
  status: "pendente" as const,
  procedureType: "consulta" as const,
  procedureName: null,
  preparationResult: null,
  preparationAnsweredAt: null,
  preparationMissedItemIds: [] as string[],
  patient: {
    id: "pat-ana",
    fullName: "Ana Souza",
    phoneMasked: "(79) 9****-1234",
  },
};

const domainAppointment: Appointment = {
  id: "apt-001",
  patientId: "pat-ana",
  patientName: "Ana Souza",
  specialty: "Neurologia",
  scheduledAt: "2026-09-22T12:00:00.000Z",
  bookedAt: "2026-08-13T12:00:00.000Z",
  status: "pendente",
  phoneMasked: "(79) 9****-1234",
  procedure: { type: "consulta" },
  preparation: null,
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

    await expect(repo.list()).resolves.toEqual([domainAppointment]);
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

  it("saveOffered grava paciente, data da nova marcação, status e preparo zerado, devolvendo nome e telefone do paciente", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockResolvedValue({
      ...record,
      bookedAt: new Date("2026-09-20T15:00:00.000Z"),
      status: "pendente",
      patient: {
        id: "pat-helena",
        fullName: "Helena Dias",
        phoneMasked: "(79) 9****-4444",
      },
    });

    const saved = await repo.saveOffered({
      ...domainAppointment,
      patientId: "pat-helena",
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-4444",
      bookedAt: "2026-09-20T15:00:00.000Z",
    });

    expect(client.update).toHaveBeenCalledWith({
      where: { id: "apt-001" },
      data: {
        patientId: "pat-helena",
        bookedAt: "2026-09-20T15:00:00.000Z",
        status: "pendente",
        preparationResult: null,
        preparationAnsweredAt: null,
        preparationMissedItemIds: [],
      },
      select: appointmentSelect,
    });
    expect(saved).toMatchObject({
      patientId: "pat-helena",
      patientName: "Helena Dias",
      phoneMasked: "(79) 9****-4444",
      bookedAt: "2026-09-20T15:00:00.000Z",
    });
  });

  it("saveOffered converte P2025 em AppointmentNotFoundError", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockRejectedValue(notFound);

    await expect(repo.saveOffered(domainAppointment)).rejects.toBeInstanceOf(
      AppointmentNotFoundError,
    );
  });

  it("saveOffered propaga outros erros com contexto", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockRejectedValue(new Error("timeout"));

    await expect(repo.saveOffered(domainAppointment)).rejects.toThrow(
      "Falha ao oferecer vaga: timeout",
    );
  });

  it("savePreparationAnswer grava só as colunas do preparo", async () => {
    const { appointment: client, repo } = setup();
    const answeredAt = "2026-09-23T21:00:00.000Z";
    client.update.mockResolvedValue({
      ...record,
      preparationResult: "nao_cumprido",
      preparationAnsweredAt: new Date(answeredAt),
      preparationMissedItemIds: ["prep-glicemia-jejum-jejum"],
    });

    const saved = await repo.savePreparationAnswer({
      ...domainAppointment,
      preparation: {
        result: "nao_cumprido",
        missedItemIds: ["prep-glicemia-jejum-jejum"],
        answeredAt,
      },
    });

    expect(client.update).toHaveBeenCalledWith({
      where: { id: "apt-001" },
      data: {
        preparationResult: "nao_cumprido",
        preparationAnsweredAt: answeredAt,
        preparationMissedItemIds: ["prep-glicemia-jejum-jejum"],
      },
      select: appointmentSelect,
    });
    expect(saved.preparation).toEqual({
      result: "nao_cumprido",
      missedItemIds: ["prep-glicemia-jejum-jejum"],
      answeredAt,
    });
  });

  it("savePreparationAnswer propaga erro com contexto", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockRejectedValue(new Error("violates check constraint"));

    await expect(repo.savePreparationAnswer(domainAppointment)).rejects.toThrow(
      "Falha ao salvar preparo: violates check constraint",
    );
  });

  it("saveReleased grava só o status", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockResolvedValue({ ...record, status: "liberado" });

    const saved = await repo.saveReleased({ ...domainAppointment, status: "liberado" });

    expect(client.update).toHaveBeenCalledWith({
      where: { id: "apt-001" },
      data: { status: "liberado" },
      select: appointmentSelect,
    });
    expect(saved.status).toBe("liberado");
  });

  it("saveReleased converte P2025 em AppointmentNotFoundError", async () => {
    const { appointment: client, repo } = setup();
    client.update.mockRejectedValue(notFound);

    await expect(repo.saveReleased(domainAppointment)).rejects.toBeInstanceOf(
      AppointmentNotFoundError,
    );
  });
});
