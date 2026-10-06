import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "../appointment";
import {
  distanceFactor,
  historyFactor,
  leadTimeFactor,
  leadTimeInDays,
  recentOutcomes,
  scheduleFactor,
  specialtyFactor,
} from "./risk-factors";
import { NO_SHOW_RISK_WEIGHTS as W } from "./risk-weights";
import type { HistoryEntry, RiskTarget } from "./types";

const DAY = 24 * 60 * 60 * 1000;

/** Terça-feira, 9h em Maceió, marcada com 7 dias: neutra em dia/horário e antecedência. */
function target(overrides: Partial<RiskTarget> = {}): RiskTarget {
  return {
    id: "apt-x",
    patientId: "pat-x",
    specialty: "Clínica Geral",
    scheduledAt: "2026-09-22T12:00:00.000Z",
    bookedAt: "2026-09-15T12:00:00.000Z",
    ...overrides,
  };
}

function past(
  status: AppointmentStatus,
  daysBefore: number,
  patientId = "pat-x",
): HistoryEntry {
  return {
    patientId,
    status,
    scheduledAt: new Date(Date.parse("2026-09-22T12:00:00.000Z") - daysBefore * DAY).toISOString(),
  };
}

function bookedDaysBefore(days: number): RiskTarget {
  const scheduledAt = "2026-09-22T12:00:00.000Z";
  return target({
    scheduledAt,
    bookedAt: new Date(Date.parse(scheduledAt) - days * DAY).toISOString(),
  });
}

describe("recentOutcomes (janela do histórico)", () => {
  it("considera só desfechos anteriores do mesmo paciente, do mais recente ao mais antigo", () => {
    const history: HistoryEntry[] = [
      past("faltou", 90),
      past("compareceu", 10),
      past("faltou", 30),
      past("faltou", 60),
      past("faltou", 5, "pat-outro"),
      past("pendente", 2),
      { patientId: "pat-x", status: "faltou", scheduledAt: "2026-10-01T12:00:00.000Z" },
    ];

    const outcomes = recentOutcomes(target(), history, W.history.window);

    expect(outcomes.map((entry) => entry.scheduledAt)).toEqual([
      past("compareceu", 10).scheduledAt,
      past("faltou", 30).scheduledAt,
      past("faltou", 60).scheduledAt,
    ]);
  });

  it("ignora a própria consulta, que acontece no mesmo horário", () => {
    const self: HistoryEntry = { patientId: "pat-x", status: "faltou", scheduledAt: target().scheduledAt };
    expect(recentOutcomes(target(), [self], W.history.window)).toEqual([]);
  });
});

describe("historyFactor", () => {
  it("sem histórico não soma pontos", () => {
    expect(historyFactor(target(), [], W.history)).toEqual({
      factor: "historico",
      points: 0,
      description: "Sem consultas anteriores registradas",
    });
  });

  it("2 faltas em 3 (taxa acima do limite alto) soma o peso alto", () => {
    const reason = historyFactor(
      target(),
      [past("faltou", 10), past("compareceu", 20), past("faltou", 30)],
      W.history,
    );
    expect(reason.points).toBe(W.history.high.points);
    expect(reason.description).toBe("Faltou 2 das últimas 3 consultas");
  });

  it("1 falta em 3 (taxa entre os limites) soma o peso médio", () => {
    const reason = historyFactor(
      target(),
      [past("faltou", 10), past("compareceu", 20), past("compareceu", 30)],
      W.history,
    );
    expect(reason.points).toBe(W.history.medium.points);
    expect(reason.description).toBe("Faltou 1 das últimas 3 consultas");
  });

  it("todas as consultas com falta usa texto direto", () => {
    const reason = historyFactor(target(), [past("faltou", 10), past("faltou", 20)], W.history);
    expect(reason.points).toBe(W.history.high.points);
    expect(reason.description).toBe("Faltou às últimas 2 consultas");
  });

  it("uma única falta conta como taxa máxima", () => {
    const reason = historyFactor(target(), [past("faltou", 10)], W.history);
    expect(reason.points).toBe(W.history.high.points);
    expect(reason.description).toBe("Faltou à última consulta");
  });

  it("sem faltas e com histórico suficiente reduz o risco", () => {
    const reason = historyFactor(
      target(),
      [past("compareceu", 10), past("compareceu", 20)],
      W.history,
    );
    expect(reason.points).toBe(W.history.reliable.points);
    expect(reason.description).toBe("Compareceu às últimas 2 consultas");
  });

  it("um único comparecimento ainda não basta para reduzir o risco", () => {
    const reason = historyFactor(target(), [past("compareceu", 10)], W.history);
    expect(reason.points).toBe(0);
    expect(reason.description).toBe("Compareceu à última consulta");
  });

  it("falta antiga fora da janela não pesa", () => {
    const reason = historyFactor(
      target(),
      [past("compareceu", 10), past("compareceu", 20), past("compareceu", 30), past("faltou", 40)],
      W.history,
    );
    expect(reason.points).toBe(W.history.reliable.points);
  });
});

describe("specialtyFactor", () => {
  it("especialidade com mais faltas soma o peso configurado", () => {
    expect(specialtyFactor(target({ specialty: "Oftalmologia" }), W.specialty)).toEqual({
      factor: "especialidade",
      points: W.specialty.Oftalmologia,
      description: "Oftalmologia costuma ter mais faltas",
    });
  });

  it("especialidade fora da lista não soma pontos", () => {
    const reason = specialtyFactor(target({ specialty: "Cardiologia" }), W.specialty);
    expect(reason.points).toBe(0);
    expect(reason.description).toBe("Cardiologia sem risco adicional");
  });
});

describe("scheduleFactor (fuso da clínica)", () => {
  it("terça às 9h não soma pontos", () => {
    const reason = scheduleFactor(target(), W.schedule);
    expect(reason.points).toBe(0);
    expect(reason.description).toBe("Terça-feira às 9h00, sem risco adicional");
  });

  it("02:00 UTC de terça é segunda às 23h em Maceió: soma dia e horário", () => {
    const reason = scheduleFactor(target({ scheduledAt: "2026-09-22T02:00:00.000Z" }), W.schedule);
    expect(reason.points).toBe(W.schedule.weekdayPoints + W.schedule.offHoursPoints);
    expect(reason.description).toBe("Segunda-feira às 23h00, dia e horário com mais faltas");
  });

  it("sexta em horário comercial soma só o dia", () => {
    const reason = scheduleFactor(target({ scheduledAt: "2026-09-25T13:00:00.000Z" }), W.schedule);
    expect(reason.points).toBe(W.schedule.weekdayPoints);
    expect(reason.description).toBe("Sexta-feira, dia da semana com mais faltas");
  });

  it.each([
    ["7h59 é cedo", "2026-09-22T10:59:00.000Z", W.schedule.offHoursPoints],
    ["8h00 não é cedo", "2026-09-22T11:00:00.000Z", 0],
    ["16h59 não é fim do dia", "2026-09-22T19:59:00.000Z", 0],
    ["17h00 é fim do dia", "2026-09-22T20:00:00.000Z", W.schedule.offHoursPoints],
  ])("%s", (_label, scheduledAt, expected) => {
    expect(scheduleFactor(target({ scheduledAt }), W.schedule).points).toBe(expected);
  });

  it("horário cedo usa texto do horário", () => {
    const reason = scheduleFactor(target({ scheduledAt: "2026-09-24T10:30:00.000Z" }), W.schedule);
    expect(reason.description).toBe("Às 7h30, fora do horário de maior comparecimento");
  });
});

describe("leadTimeFactor", () => {
  it.each([
    [W.leadTime.long.minDays, W.leadTime.long.points],
    [W.leadTime.long.minDays - 1, W.leadTime.medium.points],
    [W.leadTime.medium.minDays, W.leadTime.medium.points],
    [W.leadTime.medium.minDays - 1, 0],
    [W.leadTime.short.maxDays + 1, 0],
    [W.leadTime.short.maxDays, W.leadTime.short.points],
    [0, W.leadTime.short.points],
  ])("%i dias de antecedência valem %i pontos", (days, expected) => {
    expect(leadTimeFactor(bookedDaysBefore(days), W.leadTime).points).toBe(expected);
  });

  it("descreve a antecedência em dias", () => {
    expect(leadTimeFactor(bookedDaysBefore(40), W.leadTime).description).toBe(
      "Marcado com 40 dias de antecedência",
    );
    expect(leadTimeFactor(bookedDaysBefore(1), W.leadTime).description).toBe(
      "Marcado com 1 dia de antecedência",
    );
    expect(leadTimeFactor(bookedDaysBefore(0), W.leadTime).description).toBe(
      "Marcado no mesmo dia",
    );
  });

  it("conta dias inteiros e nunca fica negativo", () => {
    expect(
      leadTimeInDays(target({ bookedAt: "2026-09-21T13:00:00.000Z" })),
    ).toBe(0);
    expect(
      leadTimeInDays(target({ bookedAt: "2026-09-23T12:00:00.000Z" })),
    ).toBe(0);
  });
});

describe("distanceFactor", () => {
  it.each([
    [W.distance.far.minKm, W.distance.far.points],
    [W.distance.far.minKm - 0.1, W.distance.medium.points],
    [W.distance.medium.minKm, W.distance.medium.points],
    [W.distance.medium.minKm - 0.1, 0],
    [W.distance.near.maxKm, 0],
    [W.distance.near.maxKm - 0.1, W.distance.near.points],
  ])("%f km valem %i pontos", (km, expected) => {
    expect(distanceFactor(km, W.distance).points).toBe(expected);
  });

  it("distância desconhecida não soma pontos", () => {
    expect(distanceFactor(null, W.distance)).toEqual({
      factor: "distancia",
      points: 0,
      description: "Bairro do paciente não informado",
    });
  });

  it("arredonda a distância no texto", () => {
    expect(distanceFactor(8.6, W.distance).description).toBe("Mora a cerca de 9 km da clínica");
    expect(distanceFactor(0.4, W.distance).description).toBe("Mora a menos de 1 km da clínica");
  });
});
