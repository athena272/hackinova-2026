"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import { AppointmentTable } from "@/components/AppointmentTable";

export default function PainelPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      const payload = (await response.json()) as {
        appointments?: Appointment[];
        error?: string;
      };
      if (!response.ok || !payload.appointments) {
        throw new Error(payload.error ?? "Falha ao carregar agenda.");
      }
      setAppointments(payload.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const pendente = appointments.filter((a) => a.status === "pendente").length;
    const confirmado = appointments.filter(
      (a) => a.status === "confirmado",
    ).length;
    const liberado = appointments.filter((a) => a.status === "liberado").length;
    const remarcacao = appointments.filter(
      (a) => a.status === "remarcacao_solicitada",
    ).length;
    return { pendente, confirmado, liberado, remarcacao };
  }, [appointments]);

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
              <LayoutDashboard size={22} />
            </span>
            <h1>Painel da clínica</h1>
          </div>
          <p className="lead">
            Acompanhe confirmações e vagas que podem ser reaproveitadas. Os
            dados vêm do seed em memória (reiniciam ao reiniciar o servidor).
          </p>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button type="button" onClick={() => void load()}>
            <RefreshCw
              size={16}
              className={loading ? "spin" : undefined}
              aria-hidden
            />
            Atualizar
          </button>
        </div>
      </div>

      {!loading && !error ? (
        <div className="stats-row">
          <div className="stat">
            <div className="stat-label">
              <CalendarClock size={14} aria-hidden /> Pendente
            </div>
            <div className="stat-value">{stats.pendente}</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <CheckCircle2 size={14} aria-hidden /> Confirmado
            </div>
            <div className="stat-value">{stats.confirmado}</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <CircleAlert size={14} aria-hidden /> Liberado
            </div>
            <div className="stat-value">{stats.liberado}</div>
          </div>
          <div className="stat">
            <div className="stat-label">
              <RefreshCw size={14} aria-hidden /> Remarcação
            </div>
            <div className="stat-value">{stats.remarcacao}</div>
          </div>
        </div>
      ) : null}

      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error ? (
        <AppointmentTable appointments={appointments} />
      ) : null}
    </motion.main>
  );
}
