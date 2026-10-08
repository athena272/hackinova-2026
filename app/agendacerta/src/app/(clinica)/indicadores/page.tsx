"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, TrendingUp } from "lucide-react";
import { RecoveryMetricsView } from "@/components/RecoveryMetricsSummary";
import { RecoveryPeriodFilter } from "@/components/RecoveryPeriodFilter";
import { clinicToday, periodContaining, type MetricsPeriod } from "@/domain/recovery-metrics";
import { useRecoveryMetrics } from "@/hooks/use-recovery-metrics";

export default function IndicadoresPage() {
  const [today] = useState(() => clinicToday(new Date()));
  const [period, setPeriod] = useState<MetricsPeriod>(() => periodContaining("semana", today));
  const { state, reload, refresh, refreshing, refreshError } = useRecoveryMetrics(period);

  return (
    <motion.main
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-header">
        <div>
          <div className="page-title-row">
            <span className="page-icon" aria-hidden>
              <TrendingUp size={22} />
            </span>
            <h1>Indicadores</h1>
          </div>
          <p className="lead">
            Quantas vagas que ficariam vazias voltaram a ter paciente, quanto isso representa e
            como anda a taxa de faltas.
          </p>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button type="button" onClick={() => void refresh()} disabled={state.status === "loading"}>
            <RefreshCw
              size={16}
              className={state.status === "loading" || refreshing ? "spin" : undefined}
              aria-hidden
            />
            Atualizar
          </button>
        </div>
      </div>

      <RecoveryPeriodFilter period={period} today={today} onChange={setPeriod} />

      {refreshError ? (
        <div className="risk-notice" role="alert">
          <span>
            <strong>Não foi possível atualizar.</strong> {refreshError} Os números abaixo são da
            última consulta.
          </span>
        </div>
      ) : null}

      <RecoveryMetricsView metrics={state} onRetry={() => void reload()} />
    </motion.main>
  );
}
