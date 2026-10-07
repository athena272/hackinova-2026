"use client";

import { useState } from "react";
import { CopyX, Loader2, MapPin, RefreshCw, Send } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type { DuplicateAlert, DuplicateGroup } from "@/domain/duplicate-booking";
import { type DuplicateBookingsState, sendDuplicateCheck } from "@/hooks/use-duplicate-bookings";
import { formatDateTime, formatTime } from "@/lib/format";

type DuplicateBookingAlertsProps = {
  duplicates: DuplicateBookingsState;
  /** Falha ao atualizar com dados já na tela. */
  refreshError?: string | null;
  onRetry: () => void;
  /** Confirmação enviada: o alerta passa a mostrar que espera o paciente. */
  onSent: () => void;
};

/** Exame é descrito pelo nome; consulta, pela especialidade. */
export function duplicateServiceLabel(group: Pick<DuplicateGroup, "procedure" | "specialty">): string {
  return group.procedure.type === "exame" ? group.procedure.examName : group.specialty;
}

export function unitLabel(appointment: Pick<Appointment, "unit">): string {
  return appointment.unit?.name ?? "Unidade não informada";
}

type SendButtonProps = {
  sending: boolean;
  onSend: () => void;
};

export function DuplicateSendButton({ sending, onSend }: SendButtonProps) {
  return (
    <button type="button" className="duplicate-send" disabled={sending} onClick={onSend}>
      {sending ? (
        <>
          <Loader2 size={14} className="spin" aria-hidden />
          Enviando…
        </>
      ) : (
        <>
          <Send size={14} aria-hidden />
          Enviar confirmação reforçada
        </>
      )}
    </button>
  );
}

type ItemProps = {
  alert: DuplicateAlert;
  onSent: () => void;
};

export function DuplicateAlertItem({ alert, onSent }: ItemProps) {
  const [sending, setSending] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const awaitingSince = alert.check?.sentAt ?? sentAt;

  async function send() {
    setSending(true);
    setError(null);
    try {
      const check = await sendDuplicateCheck(alert.appointments.map(({ id }) => id));
      setSentAt(check.sentAt);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSending(false);
    }
  }

  return (
    <li className="duplicate-alert">
      <div className="duplicate-alert-body">
        <strong>{alert.patientName}</strong>
        <div className="muted">
          {alert.appointments.length} agendamentos de {duplicateServiceLabel(alert)}
        </div>
        <ul className="duplicate-slots">
          {alert.appointments.map((appointment) => (
            <li key={appointment.id}>
              {formatDateTime(appointment.scheduledAt)}
              <span className="duplicate-unit">
                <MapPin size={12} aria-hidden />
                {unitLabel(appointment)}
              </span>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="error duplicate-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {awaitingSince ? (
        <p className="duplicate-waiting" role="status">
          Aguardando o paciente escolher no WhatsApp (enviada às {formatTime(awaitingSince)})
        </p>
      ) : (
        <DuplicateSendButton sending={sending} onSend={() => void send()} />
      )}
    </li>
  );
}

/** Mesmo paciente com mais de um horário para o mesmo serviço em datas próximas. */
export function DuplicateBookingAlerts({
  duplicates,
  refreshError,
  onRetry,
  onSent,
}: DuplicateBookingAlertsProps) {
  if (duplicates.status === "loading") {
    return (
      <p className="duplicate-status muted" role="status">
        <Loader2 size={12} className="spin" aria-hidden />
        Buscando possíveis duplicidades…
      </p>
    );
  }

  if (duplicates.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>
          <strong>Detecção de duplicidade indisponível.</strong> {duplicates.message}
        </span>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  const { alerts } = duplicates.data;
  if (alerts.length === 0 && !refreshError) return null;

  return (
    <div className="duplicate-alerts" aria-labelledby="duplicate-alerts-title">
      <p className="duplicate-alerts-title" id="duplicate-alerts-title">
        <CopyX size={16} aria-hidden />
        Possível booking duplo: pergunte ao paciente qual horário manter
      </p>
      {refreshError ? (
        <p className="error duplicate-error" role="alert">
          Não foi possível atualizar as duplicidades: {refreshError}
        </p>
      ) : null}
      {alerts.length > 0 ? (
        <ul>
          {alerts.map((alert) => (
            <DuplicateAlertItem key={alert.key} alert={alert} onSent={onSent} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
