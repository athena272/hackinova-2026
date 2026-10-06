import { Loader2 } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import {
  isRiskScorable,
  type NoShowRisk,
  type RiskBand,
  type RiskReason,
} from "@/domain/no-show-risk";
import type { NoShowRisksState } from "@/hooks/use-no-show-risks";

const BAND_LABELS: Record<RiskBand, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

const TOP_REASONS = 2;

type NoShowRiskCellProps = {
  appointment: Pick<Appointment, "id" | "status">;
  risks: NoShowRisksState;
};

function formatPoints(points: number): string {
  if (points > 0) return `+${points} pts`;
  if (points < 0) return `${points} pts`;
  return "0 pts";
}

function NoScore() {
  return (
    <span className="muted" title="Só consultas pendentes ou confirmadas recebem score">
      -
    </span>
  );
}

function ReasonList({ reasons }: { reasons: readonly RiskReason[] }) {
  return (
    <ul className="risk-reasons">
      {reasons.map((reason) => (
        <li key={reason.factor}>{reason.description}</li>
      ))}
    </ul>
  );
}

function RiskSummary({ risk }: { risk: NoShowRisk }) {
  const relevant = risk.reasons.filter((reason) => reason.points !== 0);
  const top = relevant.slice(0, TOP_REASONS);

  return (
    <div className="risk-cell">
      <span className={`badge risk-badge risk-${risk.band}`}>
        {risk.probability}% · {BAND_LABELS[risk.band]}
      </span>
      {top.length > 0 ? <ReasonList reasons={top} /> : null}
      <details className="risk-details">
        <summary>ver todos os motivos</summary>
        <ul className="risk-reasons">
          {risk.reasons.map((reason) => (
            <li key={reason.factor}>
              {reason.description}{" "}
              <span className="muted">({formatPoints(reason.points)})</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function NoShowRiskCell({ appointment, risks }: NoShowRiskCellProps) {
  if (!isRiskScorable(appointment.status)) {
    return <NoScore />;
  }

  if (risks.status === "loading") {
    return (
      <span className="risk-loading muted">
        <Loader2 size={12} className="spin" aria-hidden />
        Calculando risco…
      </span>
    );
  }

  if (risks.status === "error") {
    return <span className="muted">Risco indisponível</span>;
  }

  const risk = risks.risksById.get(appointment.id);
  return risk ? <RiskSummary risk={risk} /> : <NoScore />;
}
