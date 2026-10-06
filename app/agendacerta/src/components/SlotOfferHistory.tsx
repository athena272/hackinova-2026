import { Loader2, RefreshCw } from "lucide-react";
import type { Appointment } from "@/domain/appointment";
import type {
  CascadeState,
  SlotOffer,
  SlotOfferCascade,
  SlotOfferStatus,
} from "@/domain/slot-offer";
import type { SlotOffersState } from "@/hooks/use-slot-offers";
import { formatDateTime, formatDistance, formatTime } from "@/lib/format";
import { OfferCountdown } from "./OfferCountdown";

const OFFER_STATUS_LABEL: Record<SlotOfferStatus, string> = {
  pendente: "aguardando resposta",
  aceita: "aceitou",
  recusada: "recusou",
  expirada: "não respondeu a tempo",
};

const CASCADE_LABEL: Record<CascadeState, string> = {
  em_andamento: "Em andamento",
  aceita: "Vaga preenchida",
  encerrada: "Encerrada sem aceite",
};

type SlotOfferHistoryProps = {
  offers: SlotOffersState;
  refreshing: boolean;
  refreshError: string | null;
  /** Para mostrar especialidade e horário da vaga. */
  appointments: readonly Appointment[];
  onRetry: () => void;
  onRefresh: () => void;
};

export function SlotOfferHistory({
  offers,
  refreshing,
  refreshError,
  appointments,
  onRetry,
  onRefresh,
}: SlotOfferHistoryProps) {
  if (offers.status === "loading") {
    return (
      <p className="muted slot-history-loading" role="status">
        <Loader2 size={14} className="spin" aria-hidden />
        Carregando histórico…
      </p>
    );
  }

  if (offers.status === "error") {
    return (
      <div className="risk-notice" role="alert">
        <span>
          <strong>Histórico de ofertas indisponível.</strong> {offers.message}
        </span>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden />
          Tentar de novo
        </button>
      </div>
    );
  }

  const appointmentById = new Map(appointments.map((item) => [item.id, item]));

  return (
    <div className="slot-history">
      <div className="slot-history-toolbar">
        {refreshing ? (
          <span className="muted slot-history-refreshing" role="status">
            <Loader2 size={12} className="spin" aria-hidden />
            Atualizando…
          </span>
        ) : null}
        {refreshError ? (
          <span className="error slot-history-refresh-error" role="alert">
            Não foi possível atualizar: {refreshError}
          </span>
        ) : null}
        <button type="button" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={12} className={refreshing ? "spin" : undefined} aria-hidden />
          Atualizar histórico
        </button>
      </div>

      {offers.data.length === 0 ? (
        <p className="muted">
          Nenhuma oferta feita ainda. Inicie uma oferta numa vaga reaproveitável da agenda.
        </p>
      ) : (
        <ul className="slot-history-list">
          {offers.data.map((cascade) => (
            <CascadeItem
              key={cascade.appointmentId}
              cascade={cascade}
              appointment={appointmentById.get(cascade.appointmentId)}
              onExpire={onRefresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

type CascadeItemProps = {
  cascade: SlotOfferCascade;
  appointment?: Appointment;
  onExpire: () => void;
};

function CascadeItem({ cascade, appointment, onExpire }: CascadeItemProps) {
  return (
    <li className="slot-history-item">
      <div className="slot-history-head">
        <strong>
          {appointment
            ? `${appointment.specialty} · ${formatDateTime(appointment.scheduledAt)}`
            : `Vaga ${cascade.appointmentId}`}
        </strong>
        <span className={`slot-cascade slot-cascade-${cascade.state}`}>
          {CASCADE_LABEL[cascade.state]}
        </span>
      </div>
      <ol className="slot-history-offers">
        {cascade.offers.map((offer) => (
          <OfferLine key={offer.id} offer={offer} onExpire={onExpire} />
        ))}
      </ol>
    </li>
  );
}

function OfferLine({ offer, onExpire }: { offer: SlotOffer; onExpire: () => void }) {
  return (
    <li className={`slot-offer-line slot-offer-${offer.status}`}>
      <span>
        <strong>{offer.candidate.patientName}</strong> · {formatDistance(offer.distanceKm)} ·
        oferecida às {formatTime(offer.offeredAt)} ({offer.timeoutMinutes} min)
      </span>
      <span className="slot-offer-outcome">
        {OFFER_STATUS_LABEL[offer.status]}
        {offer.status === "pendente" ? (
          <OfferCountdown expiresAt={offer.expiresAt} onExpire={onExpire} />
        ) : null}
      </span>
    </li>
  );
}
