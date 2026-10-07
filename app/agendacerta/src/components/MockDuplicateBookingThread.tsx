"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CopyX, Loader2, MessageCircle, RotateCcw } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type { DuplicateAlert, DuplicateCheckResolution } from "@/domain/duplicate-booking";
import {
  chooseDuplicateBooking,
  type DuplicateBookingsState,
} from "@/hooks/use-duplicate-bookings";
import { formatDateTime, initials } from "@/lib/format";
import { duplicateServiceLabel, unitLabel } from "./DuplicateBookingAlerts";

type MockDuplicateBookingThreadProps = {
  duplicates: DuplicateBookingsState;
  onRetry: () => void;
  /** Escolha falhou: a confirmação pode ter sido respondida em outra aba. */
  onRefresh: () => void;
  onChosen: (result: DuplicateCheckResolution) => void;
};

/** Confirmação enviada pela clínica, com os horários que o paciente precisa escolher. */
export type AwaitingDuplicateCheck = {
  checkId: string;
  alert: DuplicateAlert;
  slots: Appointment[];
};

export function awaitingChecksOf(alerts: readonly DuplicateAlert[]): AwaitingDuplicateCheck[] {
  return alerts.flatMap((alert) => {
    if (!alert.check) return [];
    const asked = new Set(alert.check.appointmentIds);
    return [
      {
        checkId: alert.check.id,
        alert,
        slots: alert.appointments.filter(({ id }) => asked.has(id)),
      },
    ];
  });
}

const COUNT_WORDS: Record<number, string> = { 2: "dois", 3: "três", 4: "quatro" };

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function duplicateCheckMessage({ alert, slots }: AwaitingDuplicateCheck): string {
  const count = COUNT_WORDS[slots.length] ?? String(slots.length);
  const lines = slots.map(
    (slot) => `• ${formatDateTime(slot.scheduledAt)}, ${unitLabel(slot)}`,
  );
  return [
    `Olá, ${firstName(alert.patientName)}. Encontramos ${count} agendamentos de ${duplicateServiceLabel(alert)} no seu nome:`,
    ...lines,
    slots.length > 2
      ? "Qual horário você quer manter? Os outros ficam livres para outros pacientes."
      : "Qual horário você quer manter? O outro fica livre para outro paciente.",
  ].join("\n");
}

type SlotButtonsProps = {
  slots: readonly Appointment[];
  /** Horário sendo enviado: todos os botões travam e o escolhido mostra o carregamento. */
  pendingId: string | null;
  onKeep: (appointmentId: string) => void;
};

export function DuplicateKeepButtons({ slots, pendingId, onKeep }: SlotButtonsProps) {
  return (
    <div className="wa-actions duplicate-keep-actions">
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          className="btn-sim"
          disabled={pendingId !== null}
          onClick={() => onKeep(slot.id)}
        >
          {pendingId === slot.id ? (
            <Loader2 size={16} className="spin" aria-hidden />
          ) : (
            <Check size={16} aria-hidden />
          )}
          {pendingId === slot.id ? "Enviando…" : `Manter ${formatDateTime(slot.scheduledAt)}`}
        </button>
      ))}
    </div>
  );
}

export function MockDuplicateBookingThread({
  duplicates,
  onRetry,
  ...rest
}: MockDuplicateBookingThreadProps) {
  if (duplicates.status === "loading") {
    return (
      <p className="muted prep-loading" role="status">
        <Loader2 size={14} className="spin" aria-hidden />
        Carregando confirmações reforçadas…
      </p>
    );
  }

  if (duplicates.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>Não foi possível carregar as confirmações reforçadas. {duplicates.message}</span>
        <button type="button" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  return <DuplicateThread {...rest} awaiting={awaitingChecksOf(duplicates.data.alerts)} />;
}

type Answered = { item: AwaitingDuplicateCheck; kept: Appointment; releasedCount: number };

type DuplicateThreadProps = Omit<MockDuplicateBookingThreadProps, "duplicates" | "onRetry"> & {
  awaiting: AwaitingDuplicateCheck[];
};

function DuplicateThread({ awaiting, onRefresh, onChosen }: DuplicateThreadProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected =
    answered?.item ??
    awaiting.find((item) => item.checkId === selectedId) ??
    awaiting[0] ??
    null;

  function select(checkId: string) {
    setSelectedId(checkId);
    setAnswered(null);
    setError(null);
  }

  async function keep(item: AwaitingDuplicateCheck, appointmentId: string) {
    setPendingId(appointmentId);
    setError(null);
    try {
      const result = await chooseDuplicateBooking(item.checkId, appointmentId);
      setAnswered({ item, kept: result.kept, releasedCount: result.released.length });
      onChosen(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      onRefresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="wa-layout">
      <div className="wa-list-panel">
        <p className="wa-list-title">
          <CopyX size={16} aria-hidden />
          Aguardando o paciente escolher
        </p>
        <div className="wa-list">
          {awaiting.length === 0 ? (
            <p className="muted">
              Nenhuma confirmação reforçada aberta. Envie uma pelo painel, no alerta de
              possível booking duplo.
            </p>
          ) : (
            awaiting.map((item) => (
              <button
                key={item.checkId}
                type="button"
                className={selected?.checkId === item.checkId ? "active" : undefined}
                onClick={() => select(item.checkId)}
              >
                <strong>{item.alert.patientName}</strong>
                <div className="muted">
                  {duplicateServiceLabel(item.alert)} · {item.slots.length} horários
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="wa-phone">
        <div className="wa-header">
          <div className="wa-avatar" aria-hidden>
            {selected ? initials(selected.alert.patientName) : "AC"}
          </div>
          <div className="wa-header-text">
            <strong>{selected?.alert.patientName ?? "AgendaCerta"}</strong>
            <span>{selected ? "online · simulação WhatsApp" : "nenhuma confirmação aberta"}</span>
          </div>
          <MessageCircle size={18} aria-hidden style={{ marginLeft: "auto" }} />
        </div>

        <div className="wa-thread">
          {selected ? (
            <>
              <motion.div
                className="bubble bubble-in"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                key={`in-${selected.checkId}`}
              >
                {duplicateCheckMessage(selected)}
              </motion.div>

              {answered ? (
                <ChosenReply kept={answered.kept} releasedCount={answered.releasedCount} />
              ) : (
                <DuplicateKeepButtons
                  slots={selected.slots}
                  pendingId={pendingId}
                  onKeep={(appointmentId) => void keep(selected, appointmentId)}
                />
              )}
            </>
          ) : (
            <p className="muted">
              Quando a clínica enviar a confirmação reforçada, a mensagem aparece aqui.
            </p>
          )}
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ChosenReply({ kept, releasedCount }: { kept: Appointment; releasedCount: number }) {
  const when = formatDateTime(kept.scheduledAt);
  const released = releasedCount > 1 ? "liberamos os outros horários" : "liberamos o outro horário";
  return (
    <>
      <motion.div
        className="bubble bubble-out"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {`Quero manter o de ${when}.`}
      </motion.div>
      <motion.div
        className="bubble bubble-in"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {`Combinado! Seu horário de ${when}${kept.unit ? ` na ${kept.unit.name}` : ""} está confirmado e ${released} para quem precisa. Até lá.`}
      </motion.div>
    </>
  );
}
