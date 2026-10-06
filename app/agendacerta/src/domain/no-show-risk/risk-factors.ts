import { isAttendanceOutcome } from "../appointment";
import {
  formatClinicTime,
  getClinicDateTime,
  weekdayName,
} from "./clinic-time";
import type { NoShowRiskWeights } from "./risk-weights";
import type { HistoryEntry, RiskReason, RiskTarget } from "./types";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const pluralize = (count: number, singular: string, plural: string) =>
  count === 1 ? singular : plural;

/** Desfechos (compareceu/faltou) do paciente antes desta consulta, do mais recente ao mais antigo. */
export function recentOutcomes(
  target: RiskTarget,
  history: readonly HistoryEntry[],
  window: number,
): HistoryEntry[] {
  const targetTime = Date.parse(target.scheduledAt);
  return history
    .filter(
      (entry) =>
        entry.patientId === target.patientId &&
        isAttendanceOutcome(entry.status) &&
        Date.parse(entry.scheduledAt) < targetTime,
    )
    .sort((a, b) => Date.parse(b.scheduledAt) - Date.parse(a.scheduledAt))
    .slice(0, window);
}

export function historyFactor(
  target: RiskTarget,
  history: readonly HistoryEntry[],
  weights: NoShowRiskWeights["history"],
): RiskReason {
  const outcomes = recentOutcomes(target, history, weights.window);
  const total = outcomes.length;

  if (total === 0) {
    return {
      factor: "historico",
      points: 0,
      description: "Sem consultas anteriores registradas",
    };
  }

  const noShows = outcomes.filter((entry) => entry.status === "faltou").length;

  if (noShows === 0) {
    const reliable = total >= weights.reliable.minOutcomes;
    return {
      factor: "historico",
      points: reliable ? weights.reliable.points : 0,
      description:
        total === 1
          ? "Compareceu à última consulta"
          : `Compareceu às últimas ${total} consultas`,
    };
  }

  const rate = noShows / total;
  const points =
    rate >= weights.high.minNoShowRate
      ? weights.high.points
      : rate >= weights.medium.minNoShowRate
        ? weights.medium.points
        : 0;

  let description: string;
  if (total === 1) {
    description = "Faltou à última consulta";
  } else if (noShows === total) {
    description = `Faltou às últimas ${total} consultas`;
  } else {
    description = `Faltou ${noShows} das últimas ${total} consultas`;
  }

  return { factor: "historico", points, description };
}

export function specialtyFactor(
  target: RiskTarget,
  weights: NoShowRiskWeights["specialty"],
): RiskReason {
  const points = weights[target.specialty] ?? 0;
  return {
    factor: "especialidade",
    points,
    description:
      points > 0
        ? `${target.specialty} costuma ter mais faltas`
        : `${target.specialty} sem risco adicional`,
  };
}

export function scheduleFactor(
  target: RiskTarget,
  weights: NoShowRiskWeights["schedule"],
): RiskReason {
  const clinicTime = getClinicDateTime(target.scheduledAt);
  const riskyWeekday = weights.riskyWeekdays.includes(clinicTime.weekday);
  const offHours =
    clinicTime.hour < weights.earlyBeforeHour ||
    clinicTime.hour >= weights.lateFromHour;

  const day = capitalize(weekdayName(clinicTime.weekday));
  const time = formatClinicTime(clinicTime);
  const points =
    (riskyWeekday ? weights.weekdayPoints : 0) +
    (offHours ? weights.offHoursPoints : 0);

  let description: string;
  if (riskyWeekday && offHours) {
    description = `${day} às ${time}, dia e horário com mais faltas`;
  } else if (riskyWeekday) {
    description = `${day}, dia da semana com mais faltas`;
  } else if (offHours) {
    description = `Às ${time}, fora do horário de maior comparecimento`;
  } else {
    description = `${day} às ${time}, sem risco adicional`;
  }

  return { factor: "dia_horario", points, description };
}

/** Dias inteiros entre a marcação e a consulta. */
export function leadTimeInDays(target: RiskTarget): number {
  const diff = Date.parse(target.scheduledAt) - Date.parse(target.bookedAt);
  return Math.max(0, Math.floor(diff / DAY_IN_MS));
}

export function leadTimeFactor(
  target: RiskTarget,
  weights: NoShowRiskWeights["leadTime"],
): RiskReason {
  const days = leadTimeInDays(target);
  const points =
    days >= weights.long.minDays
      ? weights.long.points
      : days >= weights.medium.minDays
        ? weights.medium.points
        : days <= weights.short.maxDays
          ? weights.short.points
          : 0;

  return {
    factor: "antecedencia",
    points,
    description:
      days === 0
        ? "Marcado no mesmo dia"
        : `Marcado com ${days} ${pluralize(days, "dia", "dias")} de antecedência`,
  };
}

export function distanceFactor(
  distanceKm: number | null,
  weights: NoShowRiskWeights["distance"],
): RiskReason {
  if (distanceKm === null) {
    return {
      factor: "distancia",
      points: 0,
      description: "Bairro do paciente não informado",
    };
  }

  const points =
    distanceKm >= weights.far.minKm
      ? weights.far.points
      : distanceKm >= weights.medium.minKm
        ? weights.medium.points
        : distanceKm < weights.near.maxKm
          ? weights.near.points
          : 0;

  const rounded = Math.round(distanceKm);
  return {
    factor: "distancia",
    points,
    description:
      distanceKm < 1
        ? "Mora a menos de 1 km da clínica"
        : `Mora a cerca de ${rounded} km da clínica`,
  };
}
