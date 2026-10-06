"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, Megaphone, MessageCircle, RotateCcw, X } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type { SlotOffer, SlotOfferResponse } from "@/domain/slot-offer";
import {
  requestSlotOfferResponse,
  type SlotOfferResponseResult,
  type SlotOffersState,
} from "@/hooks/use-slot-offers";
import { formatDateTime, formatTime, initials } from "@/lib/format";
import { OfferCountdown } from "./OfferCountdown";

type MockSlotOfferThreadProps = {
  offers: SlotOffersState;
  appointments: readonly Appointment[];
  onRetry: () => void;
  /** Prazo zerado ou resposta enviada: busca as ofertas de novo. */
  onRefresh: () => void;
  onResponded: (result: SlotOfferResponseResult) => void;
};

export function MockSlotOfferThread({ offers, onRetry, ...rest }: MockSlotOfferThreadProps) {
  if (offers.status === "loading") {
    return (
      <p className="muted prep-loading" role="status">
        <Loader2 size={14} className="spin" aria-hidden />
        Carregando ofertas…
      </p>
    );
  }

  if (offers.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>Não foi possível carregar as ofertas. {offers.message}</span>
        <button type="button" onClick={onRetry}>
          <RotateCcw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  const pending = offers.data.flatMap((cascade) =>
    cascade.offers.filter((offer) => offer.status === "pendente"),
  );
  return <OfferThread {...rest} pending={pending} />;
}

type Answered = { offer: SlotOffer; response: SlotOfferResponse };

type OfferThreadProps = Omit<MockSlotOfferThreadProps, "offers" | "onRetry"> & {
  pending: SlotOffer[];
};

function OfferThread({ pending, appointments, onRefresh, onResponded }: OfferThreadProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [busy, setBusy] = useState<SlotOfferResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appointmentById = useMemo(
    () => new Map(appointments.map((item) => [item.id, item])),
    [appointments],
  );

  const selected =
    answered?.offer ?? pending.find((offer) => offer.id === selectedId) ?? pending[0] ?? null;
  const slot = selected ? appointmentById.get(selected.appointmentId) : undefined;

  function select(id: string) {
    setSelectedId(id);
    setAnswered(null);
    setError(null);
  }

  async function respond(offer: SlotOffer, response: SlotOfferResponse) {
    setBusy(response);
    setError(null);
    try {
      const result = await requestSlotOfferResponse(offer.id, response);
      setAnswered({ offer: result.offer, response });
      onResponded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="wa-layout">
      <div className="wa-list-panel">
        <p className="wa-list-title">
          <Megaphone size={16} aria-hidden />
          Ofertas aguardando resposta
        </p>
        <div className="wa-list">
          {pending.length === 0 ? (
            <p className="muted">
              Nenhuma oferta aberta. Inicie uma no painel, numa vaga reaproveitável.
            </p>
          ) : (
            pending.map((offer) => {
              const offerSlot = appointmentById.get(offer.appointmentId);
              return (
                <button
                  key={offer.id}
                  type="button"
                  className={selected?.id === offer.id ? "active" : undefined}
                  onClick={() => select(offer.id)}
                >
                  <strong>{offer.candidate.patientName}</strong>
                  <div className="muted">
                    {offerSlot?.specialty ?? "Vaga"} · responde até {formatTime(offer.expiresAt)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="wa-phone">
        <div className="wa-header">
          <div className="wa-avatar" aria-hidden>
            {selected ? initials(selected.candidate.patientName) : "AC"}
          </div>
          <div className="wa-header-text">
            <strong>{selected?.candidate.patientName ?? "AgendaCerta"}</strong>
            <span>{selected ? "online · simulação WhatsApp" : "nenhuma oferta aberta"}</span>
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
                {`Olá, ${selected.candidate.patientName}! Surgiu uma vaga de ${slot?.specialty ?? "consulta"}${
                  slot ? ` em ${formatDateTime(slot.scheduledAt)}` : ""
                }.\nQuer ficar com ela? Responda até ${formatTime(selected.expiresAt)}.`}
              </motion.div>

              {answered ? (
                <AnsweredReply response={answered.response} />
              ) : (
                <>
                  <div className="wa-status-row">
                    Tempo para responder:{" "}
                    <OfferCountdown expiresAt={selected.expiresAt} onExpire={onRefresh} />
                  </div>
                  <div className="wa-actions">
                    <button
                      type="button"
                      className="btn-sim"
                      disabled={busy !== null}
                      onClick={() => void respond(selected, "aceitar")}
                    >
                      {busy === "aceitar" ? (
                        <Loader2 size={16} className="spin" aria-hidden />
                      ) : (
                        <Check size={16} aria-hidden />
                      )}
                      {busy === "aceitar" ? "Enviando…" : "Aceitar"}
                    </button>
                    <button
                      type="button"
                      className="btn-nao"
                      disabled={busy !== null}
                      onClick={() => void respond(selected, "recusar")}
                    >
                      {busy === "recusar" ? (
                        <Loader2 size={16} className="spin" aria-hidden />
                      ) : (
                        <X size={16} aria-hidden />
                      )}
                      {busy === "recusar" ? "Enviando…" : "Recusar"}
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="muted">
              Quando a clínica iniciar uma oferta, a mensagem do candidato aparece aqui.
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

function AnsweredReply({ response }: { response: SlotOfferResponse }) {
  const accepted = response === "aceitar";
  return (
    <>
      <motion.div
        className="bubble bubble-out"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {accepted ? "Quero a vaga!" : "Não vou conseguir, obrigado."}
      </motion.div>
      <motion.div
        className="bubble bubble-in"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {accepted
          ? "Pronto! A vaga é sua e já está confirmada. Até lá."
          : "Tudo bem, obrigado por avisar. Você continua na lista de espera."}
      </motion.div>
    </>
  );
}
