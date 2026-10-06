import type { SlotOffer } from "./types";

export type CascadeState = "em_andamento" | "aceita" | "encerrada";

export type SlotOfferCascade = {
  appointmentId: string;
  /** Da primeira para a última oferta. */
  offers: SlotOffer[];
  state: CascadeState;
};

function stateOf(latest: SlotOffer): CascadeState {
  if (latest.status === "pendente") return "em_andamento";
  if (latest.status === "aceita") return "aceita";
  return "encerrada";
}

/**
 * Agrupa as ofertas por vaga para o histórico. A situação vem da última oferta:
 * aberta (em andamento), aceita, ou recusada/expirada sem próximo (encerrada).
 * Vagas com oferta mais recente aparecem primeiro.
 */
export function groupOffersByAppointment(offers: readonly SlotOffer[]): SlotOfferCascade[] {
  const byAppointment = new Map<string, SlotOffer[]>();
  for (const offer of offers) {
    const group = byAppointment.get(offer.appointmentId) ?? [];
    group.push(offer);
    byAppointment.set(offer.appointmentId, group);
  }

  return Array.from(byAppointment, ([appointmentId, group]) => {
    const sorted = [...group].sort(
      (a, b) => Date.parse(a.offeredAt) - Date.parse(b.offeredAt) || a.id.localeCompare(b.id),
    );
    return { appointmentId, offers: sorted, state: stateOf(sorted[sorted.length - 1]) };
  }).sort(
    (a, b) =>
      Date.parse(b.offers[b.offers.length - 1].offeredAt) -
      Date.parse(a.offers[a.offers.length - 1].offeredAt),
  );
}
