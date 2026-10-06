"use client";

import { useState } from "react";
import { ClipboardX, Loader2, Unlock } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import {
  type ExamPreparation,
  findExamPreparation,
  isAwaitingPreparationRelease,
  missedItemLabels,
} from "@/domain/exam-preparation";
import { formatDateTime } from "@/lib/format";
import { readResponseJson } from "@/lib/http";

type PreparationAlertsProps = {
  appointments: Appointment[];
  /** Só para mostrar os rótulos; sem cadastro, o item aparece pelo id. */
  preparations: readonly ExamPreparation[];
  onReleased: () => void;
};

/** Pacientes que avisaram que não vão cumprir o preparo e ainda ocupam a vaga. */
export function PreparationAlerts({
  appointments,
  preparations,
  onReleased,
}: PreparationAlertsProps) {
  const awaiting = appointments.filter(isAwaitingPreparationRelease);
  if (awaiting.length === 0) return null;

  return (
    <div className="prep-alerts" role="alert" aria-labelledby="prep-alerts-title">
      <p className="prep-alerts-title" id="prep-alerts-title">
        <ClipboardX size={16} aria-hidden />
        Preparo não cumprido: libere a vaga para a lista de espera
      </p>
      <ul>
        {awaiting.map((appointment) => (
          <PreparationAlertRow
            key={appointment.id}
            appointment={appointment}
            missedLabels={missedItemLabels(
              appointment.preparation?.missedItemIds ?? [],
              findExamPreparation(appointment.procedure, preparations),
            )}
            onReleased={onReleased}
          />
        ))}
      </ul>
    </div>
  );
}

type PreparationAlertRowProps = {
  appointment: Appointment;
  missedLabels: string[];
  onReleased: () => void;
};

function PreparationAlertRow({
  appointment,
  missedLabels,
  onReleased,
}: PreparationAlertRowProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function release() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/appointments/${appointment.id}/release`, {
        method: "POST",
      });
      const payload = await readResponseJson<{
        appointment?: Appointment;
        error?: string;
      }>(response);
      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error ?? "Falha ao liberar vaga.");
      }
      onReleased();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setBusy(false);
    }
  }

  return (
    <li className="prep-alert">
      <div>
        <strong>{appointment.patientName}</strong>
        <div className="muted">
          {appointment.specialty} · {formatDateTime(appointment.scheduledAt)}
        </div>
        <div className="prep-alert-missed">
          Não vai cumprir: {missedLabels.join(", ")}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
      <button type="button" disabled={busy} onClick={() => void release()}>
        {busy ? (
          <>
            <Loader2 size={14} className="spin" aria-hidden />
            Liberando…
          </>
        ) : (
          <>
            <Unlock size={14} aria-hidden />
            Liberar vaga
          </>
        )}
      </button>
    </li>
  );
}
