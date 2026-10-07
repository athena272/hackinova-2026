"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import type { OverbookingDecisionInput, OverbookingSuggestion } from "@/domain/overbooking";
import { requestOverbookingDecision, type OverbookingsState } from "@/hooks/use-overbookings";
import { formatDateTime, formatDistance } from "@/lib/format";
import { RiskBadge, RiskReasons } from "./RiskReasons";

type OverbookingSuggestionsProps = {
  overbookings: OverbookingsState;
  /** Falha ao atualizar com dados já na tela. */
  refreshError?: string | null;
  onRetry: () => void;
  /** Decisão gravada: agenda, risco e sugestões mudam. */
  onDecided: () => void;
};

function encaixeCount(accepted: number, limit: number): string {
  return `${accepted} de ${limit} ${limit === 1 ? "encaixe" : "encaixes"}`;
}

const DONE_MESSAGES: Record<OverbookingDecisionInput, string> = {
  aceitar: "Encaixe agendado. Atualizando a agenda…",
  recusar: "Sugestão recusada. Atualizando a agenda…",
};

type DecisionButtonsProps = {
  /** Decisão em andamento: os dois botões ficam travados e o escolhido mostra o carregamento. */
  pending: OverbookingDecisionInput | null;
  onDecide: (decision: OverbookingDecisionInput) => void;
};

export function OverbookingDecisionButtons({ pending, onDecide }: DecisionButtonsProps) {
  return (
    <div className="overbooking-actions">
      <button type="button" onClick={() => onDecide("aceitar")} disabled={pending !== null}>
        {pending === "aceitar" ? (
          <>
            <Loader2 size={12} className="spin" aria-hidden />
            Aceitando…
          </>
        ) : (
          <>
            <Check size={12} aria-hidden />
            Aceitar encaixe
          </>
        )}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => onDecide("recusar")}
        disabled={pending !== null}
      >
        {pending === "recusar" ? (
          <>
            <Loader2 size={12} className="spin" aria-hidden />
            Recusando…
          </>
        ) : (
          <>
            <X size={12} aria-hidden />
            Recusar
          </>
        )}
      </button>
    </div>
  );
}

type ItemProps = {
  suggestion: OverbookingSuggestion;
  onDecided: () => void;
};

export function OverbookingSuggestionItem({ suggestion, onDecided }: ItemProps) {
  const { block, anchor, risk, candidate, acceptedCount, limit } = suggestion;
  const [pending, setPending] = useState<OverbookingDecisionInput | null>(null);
  const [done, setDone] = useState<OverbookingDecisionInput | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: OverbookingDecisionInput) {
    setPending(decision);
    setError(null);
    try {
      await requestOverbookingDecision(anchor.id, decision);
      setDone(decision);
      onDecided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setPending(null);
    }
  }

  return (
    <li className="overbooking-item">
      <div className="overbooking-head">
        <strong>{block.specialty}</strong>
        <span className="muted">{formatDateTime(block.scheduledAt)}</span>
        <span className="overbooking-count">{encaixeCount(acceptedCount, limit)}</span>
      </div>
      <div className="overbooking-anchor">
        <span>
          Risco alto de falta: <strong>{anchor.patientName}</strong>
        </span>
        <RiskBadge risk={risk} />
      </div>
      <div className="overbooking-reasons">
        <RiskReasons reasons={risk.reasons} />
      </div>
      <p className="overbooking-candidate">
        <UserPlus size={14} aria-hidden />
        Encaixe para <strong>{candidate.patientName}</strong> ({formatDistance(candidate.distanceKm)})
      </p>
      {done ? (
        <p className="overbooking-done" role="status">
          {DONE_MESSAGES[done]}
        </p>
      ) : (
        <OverbookingDecisionButtons pending={pending} onDecide={(decision) => void decide(decision)} />
      )}
      {error ? (
        <p className="error overbooking-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function OverbookingSuggestions({
  overbookings,
  refreshError,
  onRetry,
  onDecided,
}: OverbookingSuggestionsProps) {
  if (overbookings.status === "loading") {
    return (
      <p className="overbooking-status muted" role="status">
        <Loader2 size={12} className="spin" aria-hidden />
        Buscando sugestões de encaixe…
      </p>
    );
  }

  if (overbookings.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>
          <strong>Sugestões de encaixe indisponíveis.</strong> {overbookings.message}
        </span>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  const { suggestions } = overbookings.data;
  return (
    <>
      {refreshError ? (
        <p className="error overbooking-error" role="alert">
          Não foi possível atualizar as sugestões: {refreshError}
        </p>
      ) : null}
      {suggestions.length === 0 ? (
        <p className="muted">Nenhum horário com risco alto de falta precisa de encaixe agora.</p>
      ) : (
        <ul className="overbooking-list">
          {suggestions.map((suggestion) => (
            <OverbookingSuggestionItem
              key={suggestion.block.key}
              suggestion={suggestion}
              onDecided={onDecided}
            />
          ))}
        </ul>
      )}
    </>
  );
}
