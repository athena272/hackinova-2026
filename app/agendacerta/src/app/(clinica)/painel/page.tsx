"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  History,
  LayoutDashboard,
  RefreshCw,
  UserCheck,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/domain/appointment";
import {
  countByStatus,
  splitAgendaAndHistory,
} from "@/domain/appointment-summary";
import {
  type ExamPreparation,
  type PreparationStatus,
  preparationStatusFor,
} from "@/domain/exam-preparation";
import { AppointmentTable } from "@/components/AppointmentTable";
import { PreparationAlerts } from "@/components/PreparationAlerts";
import { useExamPreparations } from "@/hooks/use-exam-preparations";
import { useNoShowRisks } from "@/hooks/use-no-show-risks";
import { buildLoginHref } from "@/lib/auth/redirect";
import { readResponseJson } from "@/lib/http";

const STAT_CARDS: readonly {
  status: AppointmentStatus;
  label: string;
  Icon: LucideIcon;
}[] = [
  { status: "pendente", label: "Pendente", Icon: CalendarClock },
  { status: "confirmado", label: "Confirmado", Icon: CheckCircle2 },
  { status: "liberado", label: "Liberado", Icon: CircleAlert },
  { status: "remarcacao_solicitada", label: "Remarcação", Icon: RefreshCw },
  { status: "compareceu", label: "Compareceu", Icon: UserCheck },
  { status: "faltou", label: "Faltou", Icon: UserX },
];

const NO_PREPARATIONS: readonly ExamPreparation[] = [];

export default function PainelPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [source, setSource] = useState<"supabase" | "memory" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appointments", { cache: "no-store" });
      if (response.status === 401) {
        setError("Sessão expirada. Redirecionando para o login…");
        router.replace(buildLoginHref("/painel"));
        return;
      }
      const payload = await readResponseJson<{
        appointments?: Appointment[];
        source?: "supabase" | "memory";
        error?: string;
      }>(response);
      if (!response.ok || !payload.appointments) {
        throw new Error(payload.error ?? "Falha ao carregar agenda.");
      }
      setAppointments(payload.appointments);
      setSource(payload.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const { state: risks, reload: reloadRisks } = useNoShowRisks();
  const { state: preparations, reload: reloadPreparations } = useExamPreparations();

  /** Oferta e liberação mudam o paciente ou o status da vaga, e com isso o risco: recarrega os dois. */
  const reloadAll = useCallback(() => {
    void load();
    void reloadRisks();
  }, [load, reloadRisks]);

  const stats = useMemo(() => countByStatus(appointments), [appointments]);
  const { agenda, history } = useMemo(
    () => splitAgendaAndHistory(appointments),
    [appointments],
  );

  /** Sem o cadastro, o painel ainda mostra as respostas já gravadas. */
  const catalog =
    preparations.status === "ready" ? preparations.data : NO_PREPARATIONS;
  const preparationStatusById = useMemo(() => {
    const byId = new Map<string, PreparationStatus>();
    for (const appointment of appointments) {
      const status = preparationStatusFor(appointment, catalog);
      if (status) byId.set(appointment.id, status);
    }
    return byId;
  }, [appointments, catalog]);

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
            Acompanhe confirmações e vagas que podem ser reaproveitadas.{" "}
            {source === "supabase"
              ? "Os dados vêm do Postgres (Supabase)."
              : source === "memory"
                ? "Os dados vêm do seed em memória (reiniciam ao reiniciar o servidor)."
                : null}
          </p>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <button type="button" onClick={reloadAll}>
            <RefreshCw
              size={16}
              className={
                loading || risks.status === "loading" || preparations.status === "loading"
                  ? "spin"
                  : undefined
              }
              aria-hidden
            />
            Atualizar
          </button>
        </div>
      </div>

      {!loading && !error ? (
        <div className="stats-row">
          {STAT_CARDS.map(({ status, label, Icon }) => (
            <div className="stat" key={status}>
              <div className="stat-label">
                <Icon size={14} aria-hidden /> {label}
              </div>
              <div className="stat-value">{stats[status]}</div>
            </div>
          ))}
        </div>
      ) : null}

      {loading ? <p className="muted">Carregando agenda e histórico…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {!loading && !error ? (
        <>
          <section className="panel-section" aria-labelledby="agenda-title">
            <h2 className="section-title" id="agenda-title">
              <CalendarDays size={18} aria-hidden /> Agenda
            </h2>
            <p className="muted section-lead">
              Confirmações em andamento e vagas que podem ser reaproveitadas.
              O risco de falta mostra quem vale lembrar primeiro.
            </p>
            {risks.status === "error" ? (
              <div className="risk-notice" role="alert">
                <span>
                  <strong>Risco de falta indisponível.</strong> {risks.message}
                </span>
                <button type="button" onClick={() => void reloadRisks()}>
                  <RefreshCw size={14} aria-hidden />
                  Tentar de novo
                </button>
              </div>
            ) : null}
            {preparations.status === "error" ? (
              <div className="risk-notice" role="alert">
                <span>
                  <strong>Cadastro de preparo indisponível.</strong>{" "}
                  {preparations.message} As respostas já recebidas continuam
                  aparecendo.
                </span>
                <button type="button" onClick={() => void reloadPreparations()}>
                  <RefreshCw size={14} aria-hidden />
                  Tentar de novo
                </button>
              </div>
            ) : null}
            <PreparationAlerts
              appointments={agenda}
              preparations={catalog}
              onReleased={reloadAll}
            />
            <AppointmentTable
              appointments={agenda}
              onOffered={reloadAll}
              emptyMessage="Nenhum agendamento na agenda."
              risks={risks}
              preparationStatusById={preparationStatusById}
            />
          </section>

          <section className="panel-section" aria-labelledby="history-title">
            <h2 className="section-title" id="history-title">
              <History size={18} aria-hidden /> Histórico de comparecimento
            </h2>
            <p className="muted section-lead">
              Consultas e exames que já aconteceram, do mais recente para o mais
              antigo.
            </p>
            <AppointmentTable
              appointments={history}
              emptyMessage="Ainda não há histórico de comparecimento."
              preparationStatusById={preparationStatusById}
            />
          </section>
        </>
      ) : null}
    </motion.main>
  );
}
