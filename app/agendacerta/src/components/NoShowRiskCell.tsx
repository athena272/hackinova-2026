import { Loader2 } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import { isRiskScorable, type NoShowRisk } from "@/domain/no-show-risk";
import type { NoShowRisksState } from "@/hooks/use-no-show-risks";
import { RiskBadge, RiskReasons } from "./RiskReasons";

type NoShowRiskCellProps = {
  appointment: Pick<Appointment, "id" | "status">;
  risks: NoShowRisksState;
};

function NoScore() {
  return (
    <span className="muted" title="Só consultas pendentes ou confirmadas recebem score">
      -
    </span>
  );
}

function RiskSummary({ risk }: { risk: NoShowRisk }) {
  return (
    <div className="risk-cell">
      <RiskBadge risk={risk} />
      <RiskReasons reasons={risk.reasons} />
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
