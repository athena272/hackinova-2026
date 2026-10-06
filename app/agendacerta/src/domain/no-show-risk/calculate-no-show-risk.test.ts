import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "../appointment";
import {
  calculateNoShowRisk,
  isRiskScorable,
  riskBandFor,
} from "./calculate-no-show-risk";
import { NO_SHOW_RISK_WEIGHTS as W, type NoShowRiskWeights } from "./risk-weights";
import type { HistoryEntry, NoShowRiskInput } from "./types";

/** Tudo neutro: terça 9h, 7 dias de antecedência, sem histórico, distância desconhecida. */
function input(overrides: Partial<NoShowRiskInput> = {}): NoShowRiskInput {
  return {
    appointment: {
      id: "apt-x",
      patientId: "pat-x",
      specialty: "Clínica Geral",
      scheduledAt: "2026-09-22T12:00:00.000Z",
      bookedAt: "2026-09-15T12:00:00.000Z",
    },
    history: [],
    distanceKm: null,
    ...overrides,
  };
}

const noShow = (scheduledAt: string): HistoryEntry => ({
  patientId: "pat-x",
  status: "faltou",
  scheduledAt,
});

describe("calculateNoShowRisk", () => {
  it("sem nenhum fator ativo fica na probabilidade base", () => {
    const risk = calculateNoShowRisk(input());
    expect(risk).toMatchObject({
      appointmentId: "apt-x",
      probability: W.baseProbability,
      band: "baixo",
    });
    expect(risk.reasons).toHaveLength(5);
  });

  it("soma os pontos de todos os fatores e ordena os motivos pelo impacto", () => {
    const risk = calculateNoShowRisk(
      input({
        appointment: {
          id: "apt-x",
          patientId: "pat-x",
          specialty: "Neurologia",
          scheduledAt: "2026-09-22T12:00:00.000Z",
          bookedAt: "2026-08-13T12:00:00.000Z",
        },
        history: [
          noShow("2026-08-01T12:00:00.000Z"),
          { patientId: "pat-x", status: "compareceu", scheduledAt: "2026-07-01T12:00:00.000Z" },
          noShow("2026-06-01T12:00:00.000Z"),
        ],
        distanceKm: 9,
      }),
    );

    const expected =
      W.baseProbability +
      W.history.high.points +
      W.leadTime.long.points +
      W.specialty.Neurologia +
      W.distance.medium.points;
    expect(risk.probability).toBe(expected);
    expect(risk.band).toBe("alto");
    expect(risk.reasons.map((reason) => reason.factor)).toEqual([
      "historico",
      "antecedencia",
      "especialidade",
      "distancia",
      "dia_horario",
    ]);
  });

  it("limita a probabilidade ao máximo configurado", () => {
    const heavy: NoShowRiskWeights = { ...W, baseProbability: 200 };
    expect(calculateNoShowRisk(input(), heavy).probability).toBe(W.maxProbability);
  });

  it("limita a probabilidade ao mínimo configurado", () => {
    const light: NoShowRiskWeights = { ...W, baseProbability: -50 };
    expect(calculateNoShowRisk(input(), light).probability).toBe(W.minProbability);
  });

  it("não altera a lista de histórico recebida", () => {
    const history = [noShow("2026-06-01T12:00:00.000Z"), noShow("2026-08-01T12:00:00.000Z")];
    const snapshot = [...history];
    calculateNoShowRisk(input({ history }));
    expect(history).toEqual(snapshot);
  });
});

describe("riskBandFor", () => {
  it.each([
    [W.bands.medium - 1, "baixo"],
    [W.bands.medium, "medio"],
    [W.bands.high - 1, "medio"],
    [W.bands.high, "alto"],
  ] as const)("%i%% é %s", (probability, band) => {
    expect(riskBandFor(probability)).toBe(band);
  });
});

describe("isRiskScorable", () => {
  it.each<[AppointmentStatus, boolean]>([
    ["pendente", true],
    ["confirmado", true],
    ["liberado", false],
    ["remarcacao_solicitada", false],
    ["compareceu", false],
    ["faltou", false],
  ])("%s → %s", (status, expected) => {
    expect(isRiskScorable(status)).toBe(expected);
  });
});
