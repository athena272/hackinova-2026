import { ChevronDown, ListChecks } from "lucide-react";
import type { NoShowRisk, RiskBand, RiskReason } from "@/domain/no-show-risk";

const BAND_LABELS: Record<RiskBand, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
};

const TOP_REASONS = 2;

function formatPoints(points: number): string {
  if (points > 0) return `+${points} pts`;
  if (points < 0) return `${points} pts`;
  return "0 pts";
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

export function RiskBadge({ risk }: { risk: Pick<NoShowRisk, "probability" | "band"> }) {
  return (
    <span className={`badge risk-badge risk-${risk.band}`}>
      {risk.probability}% · {BAND_LABELS[risk.band]}
    </span>
  );
}

/**
 * Explicação do score: os motivos de maior impacto à vista e a lista
 * completa, com os pontos, em "ver todos os motivos".
 */
export function RiskReasons({ reasons }: { reasons: readonly RiskReason[] }) {
  const top = reasons.filter((reason) => reason.points !== 0).slice(0, TOP_REASONS);

  return (
    <>
      {top.length > 0 ? <ReasonList reasons={top} /> : null}
      <details className="risk-details">
        <summary>
          <ListChecks size={13} aria-hidden />
          <span className="risk-details-show">ver todos os motivos</span>
          <span className="risk-details-hide">ocultar motivos</span>
          <ChevronDown size={13} className="risk-details-chevron" aria-hidden />
        </summary>
        <ul className="risk-reasons risk-reasons-all">
          {reasons.map((reason) => (
            <li key={reason.factor}>
              <span>{reason.description}</span>
              <span className="risk-points">{formatPoints(reason.points)}</span>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
