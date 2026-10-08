"use client";

import { CalendarCheck2, Inbox, Loader2, RefreshCw, Users, UserX, Wallet } from "lucide-react";
import { RECOVERY_ORIGINS, type RecoveryMetrics, type RecoveryOrigin } from "@/domain/recovery-metrics";
import type { RecoveryMetricsState } from "@/hooks/use-recovery-metrics";
import { formatCurrency, formatPercent } from "@/lib/format";

const ORIGIN_COPY: Record<RecoveryOrigin, { label: string; hint: string }> = {
  leilao: { label: "Leilão", hint: "Cancelamento preenchido pela oferta em cascata" },
  preparo: { label: "Preparo", hint: "Vaga liberada por preparo de exame não cumprido" },
  booking_duplo: { label: "Booking duplo", hint: "Horário descartado na confirmação reforçada" },
  overbooking: { label: "Overbooking", hint: "Encaixe aceito em horário de risco alto" },
};

function noShowDetail({ noShows, attended }: RecoveryMetrics["noShow"]): string {
  const total = noShows + attended;
  return `${noShows} ${noShows === 1 ? "falta" : "faltas"} em ${total} ${total === 1 ? "atendimento" : "atendimentos"}`;
}

function OriginBreakdown({ recovered }: Pick<RecoveryMetrics, "recovered">) {
  if (recovered.total === 0) {
    return <p className="muted metrics-empty-line">Nenhuma vaga recuperada neste período.</p>;
  }
  return (
    <ul className="metrics-origins">
      {RECOVERY_ORIGINS.map((origin) => {
        const count = recovered.byOrigin[origin];
        const share = count / recovered.total;
        return (
          <li key={origin} className="metrics-origin">
            <div className="metrics-origin-head">
              <span>
                <strong>{ORIGIN_COPY[origin].label}</strong>
                <span className="muted"> {ORIGIN_COPY[origin].hint}</span>
              </span>
              <span className="metrics-origin-count">{count}</span>
            </div>
            <div className="metrics-bar" aria-hidden>
              <span style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecoveryMetricsSummary({ metrics }: { metrics: RecoveryMetrics }) {
  if (!metrics.hasData) {
    return (
      <div className="metrics-empty">
        <Inbox size={22} aria-hidden />
        <div>
          <strong>Ainda não há dados neste período.</strong>
          <p className="muted">
            Nenhuma vaga foi recuperada e nenhum atendimento foi encerrado nessas datas. Use as setas
            para ver outra semana ou mês.
          </p>
        </div>
      </div>
    );
  }

  const { recovered, noShow, prices } = metrics;
  return (
    <>
      <div className="metrics-cards">
        <div className="stat">
          <div className="stat-label">
            <CalendarCheck2 size={14} aria-hidden /> Vagas recuperadas
          </div>
          <div className="stat-value">{recovered.total}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <Wallet size={14} aria-hidden /> Valor estimado
          </div>
          <div className="stat-value">{formatCurrency(metrics.estimatedValue)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">
            <UserX size={14} aria-hidden /> Taxa de faltas
          </div>
          {noShow.rate === null ? (
            <p className="muted metrics-stat-note">Sem comparecimentos registrados no período.</p>
          ) : (
            <>
              <div className="stat-value">{formatPercent(noShow.rate)}</div>
              <p className="muted metrics-stat-note">{noShowDetail(noShow)}</p>
            </>
          )}
        </div>
        <div className="stat">
          <div className="stat-label">
            <Users size={14} aria-hidden /> Lista de espera atendida
          </div>
          <div className="stat-value">{metrics.waitlistPatientsServed}</div>
          <p className="muted metrics-stat-note">pacientes da fila ganharam horário</p>
        </div>
      </div>

      <section className="panel-section" aria-labelledby="metrics-origins-title">
        <h2 className="section-title" id="metrics-origins-title">
          Vagas recuperadas por origem
        </h2>
        <p className="muted section-lead">
          A origem é o motivo de a vaga ter ficado livre. Conta pela data do horário recuperado.
        </p>
        <OriginBreakdown recovered={recovered} />
      </section>

      <p className="muted metrics-prices">
        Valor estimado com preço médio de {formatCurrency(prices.consulta)} por consulta e{" "}
        {formatCurrency(prices.exame)} por exame. São valores de referência da demonstração, não
        tabela de convênio.
      </p>
    </>
  );
}

type RecoveryMetricsViewProps = {
  metrics: RecoveryMetricsState;
  onRetry: () => void;
};

export function RecoveryMetricsView({ metrics, onRetry }: RecoveryMetricsViewProps) {
  if (metrics.status === "loading") {
    return (
      <p className="muted metrics-loading" role="status">
        <Loader2 size={16} className="spin" aria-hidden /> Calculando indicadores…
      </p>
    );
  }
  if (metrics.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>
          <strong>Indicadores indisponíveis.</strong> {metrics.message}
        </span>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }
  return <RecoveryMetricsSummary metrics={metrics.data} />;
}
