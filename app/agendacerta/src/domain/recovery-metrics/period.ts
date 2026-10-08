import { getClinicDate } from "../no-show-risk/clinic-time";
import type { MetricsPeriod, MetricsPeriodKind } from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const PERIOD_KINDS: Record<MetricsPeriodKind, true> = { semana: true, mes: true };

export function isMetricsPeriodKind(value: unknown): value is MetricsPeriodKind {
  return typeof value === "string" && Object.hasOwn(PERIOD_KINDS, value);
}

// Data do calendário como meia-noite UTC: somar dias não passa por horário de verão.
function toUtcDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A data em YYYY-MM-DD se ela existir no calendário (recusa 2026-02-30), senão null. */
export function parseReferenceDate(value: string): string | null {
  if (!DATE_PATTERN.test(value)) return null;
  const date = toUtcDate(value);
  return !Number.isNaN(date.getTime()) && toDateString(date) === value ? value : null;
}

export function clinicToday(now: Date): string {
  return getClinicDate(now.toISOString());
}

/** Semana de segunda a domingo ou mês do calendário que contém a data. */
export function periodContaining(kind: MetricsPeriodKind, referenceDate: string): MetricsPeriod {
  if (parseReferenceDate(referenceDate) === null) {
    throw new RangeError(`Data de referência inválida: ${referenceDate}`);
  }
  const reference = toUtcDate(referenceDate);

  if (kind === "semana") {
    const daysSinceMonday = (reference.getUTCDay() + 6) % 7;
    const start = new Date(reference.getTime() - daysSinceMonday * DAY_MS);
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return { kind, start: toDateString(start), end: toDateString(end) };
  }

  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  return {
    kind,
    start: toDateString(new Date(Date.UTC(year, month, 1))),
    end: toDateString(new Date(Date.UTC(year, month + 1, 0))),
  };
}

export function shiftPeriod(period: MetricsPeriod, direction: -1 | 1): MetricsPeriod {
  const start = toUtcDate(period.start);
  const reference =
    period.kind === "semana"
      ? new Date(start.getTime() + direction * 7 * DAY_MS)
      : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + direction, 1));
  return periodContaining(period.kind, toDateString(reference));
}

/**
 * Troca semana por mês (ou o contrário) sem perder o contexto: se hoje está no período
 * mostrado, o novo período é o de hoje; senão, o que contém o início do período mostrado.
 */
export function switchPeriodKind(
  period: MetricsPeriod,
  kind: MetricsPeriodKind,
  today: string,
): MetricsPeriod {
  if (period.kind === kind) return period;
  const showsToday = today >= period.start && today <= period.end;
  return periodContaining(kind, showsToday ? today : period.start);
}

/** Compara pela data local da clínica, não pela data UTC do instante. */
export function isInPeriod(iso: string, period: MetricsPeriod): boolean {
  const date = getClinicDate(iso);
  return date >= period.start && date <= period.end;
}
