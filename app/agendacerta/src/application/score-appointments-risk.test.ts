import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Appointment } from "@/domain/appointment";
import {
  InMemoryAppointmentRepository,
  resetAppointmentStoreForTests,
} from "@/repository/in-memory-appointment-repository";
import { InMemoryPatientRepository } from "@/repository/in-memory-patient-repository";
import type { PatientRepository } from "@/repository/patient-repository";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import { scoreAppointmentsRisk } from "./score-appointments-risk";

function riskOf(risks: Awaited<ReturnType<typeof scoreAppointmentsRisk>>, id: string) {
  return risks.find((risk) => risk.appointmentId === id);
}

describe("scoreAppointmentsRisk com o seed em memória", () => {
  beforeEach(() => {
    resetAppointmentStoreForTests();
    vi.restoreAllMocks();
  });

  it("Ana Souza (faltosa, marcada há 40 dias, mora longe) sai com risco alto", async () => {
    const risks = await scoreAppointmentsRisk(
      new InMemoryAppointmentRepository(),
      new InMemoryPatientRepository(),
    );

    const ana = riskOf(risks, "apt-001");
    expect(ana?.band).toBe("alto");
    expect(ana?.reasons.slice(0, 2).map((reason) => reason.description)).toEqual([
      "Faltou 2 das últimas 3 consultas",
      "Marcado com 40 dias de antecedência",
    ]);
    expect(ana?.reasons.map((reason) => reason.description)).toContain(
      "Mora a cerca de 9 km da clínica",
    );
  });

  it("Bruno Lima (assíduo, mora perto) sai com risco baixo", async () => {
    const risks = await scoreAppointmentsRisk(
      new InMemoryAppointmentRepository(),
      new InMemoryPatientRepository(),
    );

    const bruno = riskOf(risks, "apt-002");
    expect(bruno?.band).toBe("baixo");
    expect(bruno?.reasons[0]).toMatchObject({
      factor: "historico",
      description: "Compareceu às últimas 3 consultas",
    });
  });

  it("pontua só consultas pendentes ou confirmadas", async () => {
    const appointments = new InMemoryAppointmentRepository();
    const risks = await scoreAppointmentsRisk(appointments, new InMemoryPatientRepository());

    const scorableIds = (await appointments.list())
      .filter((item) => item.status === "pendente" || item.status === "confirmado")
      .map((item) => item.id)
      .sort();
    expect(risks.map((risk) => risk.appointmentId).sort()).toEqual(scorableIds);
    expect(riskOf(risks, "apt-006")).toBeUndefined();
    expect(risks.some((risk) => risk.appointmentId.startsWith("hist-"))).toBe(false);
  });

  it("sem o bairro da clínica, registra o erro e trata a distância como desconhecida", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const risks = await scoreAppointmentsRisk(
      new InMemoryAppointmentRepository(),
      new InMemoryPatientRepository(),
      "nb-inexistente",
    );

    expect(risks.length).toBeGreaterThan(0);
    for (const risk of risks) {
      expect(risk.reasons.find((reason) => reason.factor === "distancia")).toEqual({
        factor: "distancia",
        points: 0,
        description: "Bairro do paciente não informado",
      });
    }
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining("nb-inexistente"));
  });
});

describe("scoreAppointmentsRisk com repositórios simulados", () => {
  const scheduled: Appointment = {
    id: "apt-x",
    patientId: "pat-sem-bairro",
    patientName: "Paciente Sem Bairro",
    specialty: "Clínica Geral",
    scheduledAt: "2026-09-22T12:00:00.000Z",
    bookedAt: "2026-09-15T12:00:00.000Z",
    status: "pendente",
    phoneMasked: "(79) 9****-0000",
    procedure: { type: "consulta" },
    preparation: null,
  };

  function appointmentRepo(list: AppointmentRepository["list"]): AppointmentRepository {
    return {
      list,
      getById: vi.fn(),
      create: vi.fn(),
      confirm: vi.fn(),
      saveOffered: vi.fn(),
      savePreparationAnswer: vi.fn(),
      saveReleased: vi.fn(),
    };
  }

  function patientRepo(): PatientRepository {
    return {
      listLocations: vi
        .fn()
        .mockResolvedValue([{ patientId: "pat-sem-bairro", neighborhood: null }]),
      getNeighborhood: vi.fn().mockResolvedValue({
        id: "nb-jardins",
        name: "Jardins",
        city: "Aracaju",
        latitude: -10.944,
        longitude: -37.056,
      }),
    };
  }

  it("paciente sem bairro tem distância desconhecida, sem derrubar o cálculo", async () => {
    const [risk] = await scoreAppointmentsRisk(
      appointmentRepo(vi.fn().mockResolvedValue([scheduled])),
      patientRepo(),
    );

    expect(risk.reasons.find((reason) => reason.factor === "distancia")?.points).toBe(0);
  });

  it("propaga falha de carregamento para a rota responder 500", async () => {
    await expect(
      scoreAppointmentsRisk(
        appointmentRepo(vi.fn().mockRejectedValue(new Error("Falha ao listar agendamentos: timeout"))),
        patientRepo(),
      ),
    ).rejects.toThrow("Falha ao listar agendamentos: timeout");
  });
});
