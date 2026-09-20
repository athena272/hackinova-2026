"use client";

import { useMemo, useState } from "react";
import type { Appointment, ConfirmationAction } from "@/domain/appointment";
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
      const response = await fetch(
        `/api/appointments/${selected.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const payload = (await response.json()) as {
        appointment?: Appointment;
        error?: string;
      };

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
      <div className="wa-list">
        <p className="muted" style={{ marginBottom: 10 }}>
          Escolha uma vaga pendente:
        </p>
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

      <div className="wa-thread">
        {selected ? (
          <>
            <div className="bubble bubble-in">
              {`Olá, ${selected.patientName}!\nLembrete: ${selected.specialty} em ${formatDateTime(selected.scheduledAt)}.\nVocê confirma presença?\nResponda SIM, NÃO ou REMARCAR.`}
            </div>
            {lastReply ? (
              <div className="bubble bubble-out">{lastReply}</div>
            ) : null}
            <div>
              Status atual: <StatusBadge status={selected.status} />
            </div>
            <div className="wa-actions">
              <button
                type="button"
                className="btn-sim"
                disabled={busy || selected.status !== "pendente"}
                onClick={() => void sendAction("SIM")}
              >
                SIM
              </button>
              <button
                type="button"
                className="btn-nao"
                disabled={busy || selected.status !== "pendente"}
                onClick={() => void sendAction("NAO")}
              >
                NÃO
              </button>
              <button
                type="button"
                className="btn-remarcar"
                disabled={busy || selected.status !== "pendente"}
                onClick={() => void sendAction("REMARCAR")}
              >
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
  );
}
