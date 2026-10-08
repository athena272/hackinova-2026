"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  shiftPeriod,
  switchPeriodKind,
  type MetricsPeriod,
  type MetricsPeriodKind,
} from "@/domain/recovery-metrics";

const KIND_OPTIONS: readonly { kind: MetricsPeriodKind; label: string }[] = [
  { kind: "semana", label: "Semana" },
  { kind: "mes", label: "Mês" },
];

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function brDate(date: string, withYear: boolean): string {
  const [year, month, day] = date.split("-");
  return withYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

/** "21/09 a 27/09/2026", "28/12/2026 a 03/01/2027" ou "setembro de 2026". */
export function periodLabel(period: MetricsPeriod): string {
  if (period.kind === "mes") {
    return monthFormatter.format(new Date(`${period.start}T00:00:00.000Z`));
  }
  const sameYear = period.start.slice(0, 4) === period.end.slice(0, 4);
  return `${brDate(period.start, !sameYear)} a ${brDate(period.end, true)}`;
}

type RecoveryPeriodFilterProps = {
  period: MetricsPeriod;
  /** Data de hoje no fuso da clínica, para a troca entre semana e mês. */
  today: string;
  onChange: (period: MetricsPeriod) => void;
};

export function RecoveryPeriodFilter({ period, today, onChange }: RecoveryPeriodFilterProps) {
  const previousLabel = period.kind === "semana" ? "Semana anterior" : "Mês anterior";
  const nextLabel = period.kind === "semana" ? "Próxima semana" : "Próximo mês";

  return (
    <div className="metrics-filter">
      <div className="metrics-kind" role="group" aria-label="Agrupar por">
        {KIND_OPTIONS.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            aria-pressed={period.kind === kind}
            className={period.kind === kind ? "active" : undefined}
            onClick={() => onChange(switchPeriodKind(period, kind, today))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="metrics-nav">
        <button
          type="button"
          aria-label={previousLabel}
          title={previousLabel}
          onClick={() => onChange(shiftPeriod(period, -1))}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
        <span className="metrics-period-label" aria-live="polite">
          {periodLabel(period)}
        </span>
        <button
          type="button"
          aria-label={nextLabel}
          title={nextLabel}
          onClick={() => onChange(shiftPeriod(period, 1))}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
