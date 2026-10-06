"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Loader2, MessageCircle, RotateCcw, Send } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import {
  type ExamPreparation,
  findExamPreparation,
  preparationStatusFor,
} from "@/domain/exam-preparation";
import type { ExamPreparationsState } from "@/hooks/use-exam-preparations";
import { formatDateTime, initials } from "@/lib/format";
import { readResponseJson } from "@/lib/http";
import { PreparationBadge } from "./PreparationBadge";

type MockPreparationChecklistProps = {
  appointments: Appointment[];
  preparations: ExamPreparationsState;
  onRetryPreparations: () => void;
  onAnswered: (appointment: Appointment) => void;
};

export function MockPreparationChecklist({
  preparations,
  onRetryPreparations,
  ...rest
}: MockPreparationChecklistProps) {
  if (preparations.status === "loading") {
    return (
      <p className="muted prep-loading" role="status">
        <Loader2 size={14} className="spin" aria-hidden />
        Carregando checklist…
      </p>
    );
  }

  if (preparations.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>Não foi possível carregar o checklist. {preparations.message}</span>
        <button type="button" onClick={onRetryPreparations}>
          <RotateCcw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  return <ChecklistThread {...rest} catalog={preparations.data} />;
}

type ChecklistThreadProps = {
  appointments: Appointment[];
  catalog: ExamPreparation[];
  onAnswered: (appointment: Appointment) => void;
};

function ChecklistThread({ appointments, catalog, onAnswered }: ChecklistThreadProps) {
  const pending = useMemo(
    () =>
      appointments.filter(
        (item) => preparationStatusFor(item, catalog) === "pendente",
      ),
    [appointments, catalog],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    appointments.find((item) => item.id === selectedId) ?? pending[0] ?? null;
  const preparation = selected
    ? findExamPreparation(selected.procedure, catalog)
    : null;
  const status = selected ? preparationStatusFor(selected, catalog) : null;
  const allAnswered =
    preparation !== null && preparation.items.every((item) => item.id in answers);

  function selectAppointment(id: string) {
    setSelectedId(id);
    setAnswers({});
    setError(null);
  }

  async function sendAnswers() {
    if (!selected || !allAnswered || status !== "pendente") return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointments/${selected.id}/preparation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const payload = await readResponseJson<{
        appointment?: Appointment;
        error?: string;
      }>(response);
      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error ?? "Falha ao enviar o checklist.");
      }
      setSelectedId(payload.appointment.id);
      onAnswered(payload.appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wa-layout">
      <div className="wa-list-panel">
        <p className="wa-list-title">
          <ClipboardList size={16} aria-hidden />
          Exames com preparo pendente
        </p>
        <div className="wa-list">
          {pending.length === 0 ? (
            <p className="muted">Nenhum exame aguardando o checklist.</p>
          ) : (
            pending.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected?.id === item.id ? "active" : undefined}
                onClick={() => selectAppointment(item.id)}
              >
                <strong>{item.patientName}</strong>
                <div className="muted">
                  {item.specialty} · {formatDateTime(item.scheduledAt)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="wa-phone">
        <div className="wa-header">
          <div className="wa-avatar" aria-hidden>
            {selected ? initials(selected.patientName) : "AC"}
          </div>
          <div className="wa-header-text">
            <strong>{selected?.patientName ?? "AgendaCerta"}</strong>
            <span>
              {selected ? "online · simulação WhatsApp" : "nenhum checklist pendente"}
            </span>
          </div>
          <MessageCircle size={18} aria-hidden style={{ marginLeft: "auto" }} />
        </div>

        <div className="wa-thread">
          {selected && preparation ? (
            <>
              <motion.div
                className="bubble bubble-in"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                key={`in-${selected.id}`}
              >
                {`Olá, ${selected.patientName}!\nSeu exame de ${preparation.examName} é em ${formatDateTime(selected.scheduledAt)}.\nPreparo: ${preparation.instructions}\nResponda sim ou não para cada item.`}
              </motion.div>

              {selected.preparation ? (
                <AnsweredSummary
                  key={`out-${selected.id}`}
                  preparation={preparation}
                  missedItemIds={selected.preparation.missedItemIds}
                />
              ) : (
                <ChecklistQuestions
                  preparation={preparation}
                  answers={answers}
                  disabled={busy}
                  onAnswer={(itemId, value) =>
                    setAnswers((current) => ({ ...current, [itemId]: value }))
                  }
                />
              )}

              {status ? (
                <div className="wa-status-row">
                  Status do preparo: <PreparationBadge status={status} />
                </div>
              ) : null}

              {status === "pendente" ? (
                <div className="wa-actions">
                  <button
                    type="button"
                    className="btn-enviar"
                    disabled={busy || !allAnswered}
                    onClick={() => void sendAnswers()}
                  >
                    {busy ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden />
                        Enviando…
                      </>
                    ) : (
                      <>
                        <Send size={16} aria-hidden />
                        Enviar respostas
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">
              Quando houver exame com preparo pendente, ele aparece à esquerda.
            </p>
          )}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

type ChecklistQuestionsProps = {
  preparation: ExamPreparation;
  answers: Record<string, boolean>;
  disabled: boolean;
  onAnswer: (itemId: string, value: boolean) => void;
};

function ChecklistQuestions({
  preparation,
  answers,
  disabled,
  onAnswer,
}: ChecklistQuestionsProps) {
  return (
    <div className="prep-questions" role="group" aria-label="Checklist de preparo">
      {preparation.items.map((item) => (
        <div className="prep-question" key={item.id}>
          <p>{item.question}</p>
          <div className="prep-choice">
            <button
              type="button"
              className="btn-sim"
              aria-pressed={answers[item.id] === true}
              disabled={disabled}
              onClick={() => onAnswer(item.id, true)}
            >
              Sim
            </button>
            <button
              type="button"
              className="btn-nao"
              aria-pressed={answers[item.id] === false}
              disabled={disabled}
              onClick={() => onAnswer(item.id, false)}
            >
              Não
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type AnsweredSummaryProps = {
  preparation: ExamPreparation;
  missedItemIds: readonly string[];
};

function AnsweredSummary({ preparation, missedItemIds }: AnsweredSummaryProps) {
  const missed = new Set(missedItemIds);
  const reply = preparation.items
    .map((item) => `${item.label}: ${missed.has(item.id) ? "não" : "sim"}`)
    .join("\n");
  const followUp =
    missed.size === 0
      ? "Perfeito! Seu preparo está confirmado. Até o dia do exame."
      : "Entendido. Vamos avisar a clínica para liberar o horário e remarcar seu exame com calma.";

  return (
    <>
      <motion.div
        className="bubble bubble-out"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {reply}
      </motion.div>
      <motion.div
        className="bubble bubble-in"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {followUp}
      </motion.div>
    </>
  );
}
