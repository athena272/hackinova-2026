import { describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/domain/appointment";
import { PreparationError } from "@/domain/exam-preparation";
import {
  BEXIGA,
  examAppointment,
  JEJUM,
  ULTRASSOM,
} from "@/domain/exam-preparation/exam-preparation.test-utils";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { AppointmentNotFoundError } from "@/repository/errors";
import type { ExamPreparationRepository } from "@/repository/exam-preparation-repository";
import { answerPreparationChecklist } from "./answer-preparation-checklist";
import { releaseSlotForMissedPreparation } from "./release-slot-for-missed-preparation";

const NOW = new Date("2026-10-18T15:00:00.000Z");

function appointmentRepo(current: Appointment | null) {
  const repo = {
    list: vi.fn(),
    getById: vi.fn().mockResolvedValue(current),
    create: vi.fn(),
    confirm: vi.fn(),
    saveOffered: vi.fn(),
    savePreparationAnswer: vi.fn(async (appointment: Appointment) => appointment),
    saveReleased: vi.fn(async (appointment: Appointment) => appointment),
  } satisfies AppointmentRepository;
  return repo;
}

function preparationRepo() {
  return {
    list: vi.fn(),
    findByExamName: vi.fn(async (examName: string) =>
      examName === ULTRASSOM.examName ? ULTRASSOM : null,
    ),
  } satisfies ExamPreparationRepository;
}

describe("answerPreparationChecklist (caso de uso)", () => {
  it("valida com o preparo do exame e grava a resposta com a hora atual", async () => {
    const appointments = appointmentRepo(examAppointment());
    const preparations = preparationRepo();

    const saved = await answerPreparationChecklist(
      appointments,
      preparations,
      "apt-008",
      { [JEJUM]: true, [BEXIGA]: false },
      () => NOW,
    );

    expect(preparations.findByExamName).toHaveBeenCalledWith(ULTRASSOM.examName);
    expect(saved.preparation).toEqual({
      result: "nao_cumprido",
      missedItemIds: [BEXIGA],
      answeredAt: NOW.toISOString(),
    });
    expect(appointments.savePreparationAnswer).toHaveBeenCalledWith(saved);
  });

  it("lança AppointmentNotFoundError quando o agendamento não existe", async () => {
    const appointments = appointmentRepo(null);

    await expect(
      answerPreparationChecklist(appointments, preparationRepo(), "apt-999", {}),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
    expect(appointments.savePreparationAnswer).not.toHaveBeenCalled();
  });

  it.each([
    ["consulta", examAppointment({ procedure: { type: "consulta" } })],
    [
      "exame sem preparo cadastrado",
      examAppointment({ procedure: { type: "exame", examName: "Raio-X de tórax" } }),
    ],
  ])("recusa %s com NO_PREPARATION_REQUIRED", async (_, appointment) => {
    const appointments = appointmentRepo(appointment);

    await expect(
      answerPreparationChecklist(appointments, preparationRepo(), appointment.id, {}),
    ).rejects.toMatchObject({ code: "NO_PREPARATION_REQUIRED" });
    expect(appointments.savePreparationAnswer).not.toHaveBeenCalled();
  });

  it("não grava nada quando o domínio recusa as respostas", async () => {
    const appointments = appointmentRepo(examAppointment());

    await expect(
      answerPreparationChecklist(appointments, preparationRepo(), "apt-008", {
        [JEJUM]: true,
      }),
    ).rejects.toBeInstanceOf(PreparationError);
    expect(appointments.savePreparationAnswer).not.toHaveBeenCalled();
  });
});

describe("releaseSlotForMissedPreparation (caso de uso)", () => {
  const missed = {
    result: "nao_cumprido" as const,
    missedItemIds: [JEJUM],
    answeredAt: NOW.toISOString(),
  };

  it("libera a vaga de quem não vai cumprir o preparo", async () => {
    const appointments = appointmentRepo(examAppointment({ preparation: missed }));

    const released = await releaseSlotForMissedPreparation(appointments, "apt-008");

    expect(released).toMatchObject({ status: "liberado", preparation: missed });
    expect(appointments.saveReleased).toHaveBeenCalledWith(released);
  });

  it("lança AppointmentNotFoundError quando o agendamento não existe", async () => {
    await expect(
      releaseSlotForMissedPreparation(appointmentRepo(null), "apt-999"),
    ).rejects.toBeInstanceOf(AppointmentNotFoundError);
  });

  it("não grava nada quando o preparo não foi marcado como não cumprido", async () => {
    const appointments = appointmentRepo(examAppointment());

    await expect(
      releaseSlotForMissedPreparation(appointments, "apt-008"),
    ).rejects.toMatchObject({ code: "PREPARATION_NOT_MISSED" });
    expect(appointments.saveReleased).not.toHaveBeenCalled();
  });
});
