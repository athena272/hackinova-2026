"use client";

import { useId, useState } from "react";
import { Loader2, Send } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import {
  DEFAULT_SLOT_OFFER_TIMEOUT,
  isSlotOfferTimeout,
  SLOT_OFFER_TIMEOUT_OPTIONS,
  type SlotOfferCascade,
  type SlotOfferTimeout,
} from "@/domain/slot-offer";
import { requestStartSlotOffer } from "@/hooks/use-slot-offers";
import { formatDistance } from "@/lib/format";
import { OfferCountdown } from "./OfferCountdown";

export type SlotOfferActionsProps = {
  appointment: Appointment;
  /** Última cascata desta vaga, se houver. */
  cascade?: SlotOfferCascade;
  /** Histórico ainda carregando: não dá para saber se já existe oferta aberta. */
  loading?: boolean;
  /** Oferta criada ou prazo zerado: busca o histórico de novo. */
  onChanged: () => void;
  /** Horário com encaixe: o cancelamento só libera o encaixe e não abre leilão. */
  covered?: boolean;
};

export function SlotOfferActions({
  appointment,
  cascade,
  loading = false,
  onChanged,
  covered = false,
}: SlotOfferActionsProps) {
  const selectId = useId();
  const [timeoutMinutes, setTimeoutMinutes] = useState<SlotOfferTimeout>(
    DEFAULT_SLOT_OFFER_TIMEOUT,
  );
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <p className="slot-offer-status muted" role="status">
        <Loader2 size={12} className="spin" aria-hidden />
        Verificando ofertas…
      </p>
    );
  }

  const latest = cascade?.offers[cascade.offers.length - 1];
  if (cascade?.state === "em_andamento" && latest) {
    return (
      <div className="slot-offer">
        <p className="slot-offer-status">
          Oferecida a <strong>{latest.candidate.patientName}</strong> (
          {formatDistance(latest.distanceKm)}), expira em{" "}
          <OfferCountdown expiresAt={latest.expiresAt} onExpire={onChanged} />
        </p>
      </div>
    );
  }

  if (covered) {
    return <p className="slot-offer-covered">Vaga coberta pelo encaixe; não abre leilão</p>;
  }

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await requestStartSlotOffer(appointment.id, timeoutMinutes);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="slot-offer">
      {cascade?.state === "encerrada" ? (
        <p className="slot-offer-ended">
          Ninguém aceitou: {cascade.offers.length}{" "}
          {cascade.offers.length === 1 ? "oferta encerrada" : "ofertas encerradas"} sem resposta
          positiva.
        </p>
      ) : null}
      <div className="slot-offer-start">
        <label htmlFor={selectId}>Prazo</label>
        <select
          id={selectId}
          value={timeoutMinutes}
          disabled={starting}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (isSlotOfferTimeout(value)) setTimeoutMinutes(value);
          }}
        >
          {SLOT_OFFER_TIMEOUT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option} min
            </option>
          ))}
        </select>
        <button type="button" onClick={() => void start()} disabled={starting}>
          {starting ? (
            <>
              <Loader2 size={12} className="spin" aria-hidden />
              Iniciando…
            </>
          ) : (
            <>
              <Send size={12} aria-hidden />
              Iniciar oferta
            </>
          )}
        </button>
      </div>
      {error ? (
        <p className="error slot-offer-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
