"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  MessageCircle,
  RefreshCcw,
  Users,
  X,
} from "lucide-react";
import type { Appointment, ConfirmationAction } from "@/domain/appointment";
import { readResponseJson } from "@/lib/http";
import { StatusBadge } from "./StatusBadge";

type MockWhatsAppThreadProps = {
  appointments: Appointment[];
  onConfirmed: (appointment: Appointment) => void;
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function MockWhatsAppThread({
  appointments,
  onConfirmed,
}: MockWhatsAppThreadProps) {
  const pending = useMemo(
    () => appointments.filter((item) => item.status === "pendente"),
    [appointments],
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    pending[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const selected =
    appointments.find((item) => item.id === selectedId) ?? pending[0] ?? null;

  async function sendAction(action: ConfirmationAction) {
    if (!selected || selected.status !== "pendente") {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/appointments/${selected.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const payload = await readResponseJson<{
        appointment?: Appointment;
        error?: string;
      }>(response);

      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error ?? "Falha ao confirmar.");
      }

      setLastReply(action);
      onConfirmed(payload.appointment);

      const nextPending = appointments
        .map((item) =>
          item.id === payload.appointment!.id ? payload.appointment! : item,
        )
        .filter((item) => item.status === "pendente");
      setSelectedId(nextPending[0]?.id ?? payload.appointment.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  }

  if (appointments.length === 0) {
    return <p className="muted">Sem agendamentos para simular.</p>;
  }

  return (
    <div className="wa-layout">
      <div className="wa-list-panel">
        <p className="wa-list-title">
          <Users size={16} aria-hidden />
          Vagas pendentes
        </p>
        <div className="wa-list">
          {pending.length === 0 ? (
            <p className="muted">Não há vagas pendentes no momento.</p>
          ) : (
            pending.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected?.id === item.id ? "active" : undefined}
                onClick={() => {
                  setSelectedId(item.id);
                  setLastReply(null);
                  setError(null);
                }}
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
              {selected
                ? "online · simulação WhatsApp"
                : "escolha um paciente"}
            </span>
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
                key={`in-${selected.id}`}
              >
                {`Olá, ${selected.patientName}!\nLembrete: ${selected.specialty} em ${formatDateTime(selected.scheduledAt)}.\nVocê confirma presença?\nResponda SIM, NÃO ou REMARCAR.`}
              </motion.div>
              <AnimatePresence>
                {lastReply ? (
                  <motion.div
                    className="bubble bubble-out"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    key={`out-${selected.id}-${lastReply}`}
                  >
                    {lastReply}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <div className="wa-status-row">
                <CalendarClock size={14} aria-hidden />
                Status atual: <StatusBadge status={selected.status} />
              </div>
              <div className="wa-actions">
                <button
                  type="button"
                  className="btn-sim"
                  disabled={busy || selected.status !== "pendente"}
                  onClick={() => void sendAction("SIM")}
                >
                  <Check size={16} aria-hidden />
                  SIM
                </button>
                <button
                  type="button"
                  className="btn-nao"
                  disabled={busy || selected.status !== "pendente"}
                  onClick={() => void sendAction("NAO")}
                >
                  <X size={16} aria-hidden />
                  NÃO
                </button>
                <button
                  type="button"
                  className="btn-remarcar"
                  disabled={busy || selected.status !== "pendente"}
                  onClick={() => void sendAction("REMARCAR")}
                >
                  <RefreshCcw size={16} aria-hidden />
                  REMARCAR
                </button>
              </div>
            </>
          ) : (
            <p className="muted">Selecione um paciente à esquerda.</p>
          )}
          {error ? <p className="error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
