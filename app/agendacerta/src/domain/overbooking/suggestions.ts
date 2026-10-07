import { isActiveBooking, type Appointment } from "../appointment";
import type { NoShowRisk } from "../no-show-risk/types";
import { rankCandidates } from "../slot-offer/ranking";
import type { RankableCandidate } from "../slot-offer/types";
import {
  encaixeAppointmentIds,
  groupByBlock,
  overbookingsOfBlock,
  slotBlockOf,
} from "./blocks";
import { OverbookingError } from "./errors";
import { MAX_OVERBOOKINGS_PER_BLOCK, OVERBOOKING_RISK_BAND } from "./overbooking-rules";
import type {
  EncaixeCandidate,
  Overbooking,
  OverbookingOpportunity,
  OverbookingSuggestion,
  SlotBlock,
} from "./types";

export type OpportunityInput = {
  appointments: readonly Appointment[];
  risksById: ReadonlyMap<string, NoShowRisk>;
  overbookings: readonly Overbooking[];
  limit?: number;
};

export type SuggestionInput = OpportunityInput & {
  candidates: readonly RankableCandidate[];
  /** Pacientes com oferta de vaga em aberto: não recebem encaixe ao mesmo tempo. */
  busyPatientIds: ReadonlySet<string>;
};

function acceptedCountOf(blockOverbookings: readonly Overbooking[]): number {
  return blockOverbookings.filter((overbooking) => overbooking.decision === "aceita").length;
}

function isHighRisk(risk: NoShowRisk | undefined): risk is NoShowRisk {
  return risk?.band === OVERBOOKING_RISK_BAND;
}

/**
 * Âncora do bloco: o agendamento ativo de maior risco, desde que seja alto.
 * Encaixe nunca é âncora, senão um encaixe puxaria outro.
 */
function anchorOf(
  items: readonly Appointment[],
  risksById: ReadonlyMap<string, NoShowRisk>,
  encaixeIds: ReadonlySet<string>,
): { anchor: Appointment; risk: NoShowRisk } | null {
  let best: { anchor: Appointment; risk: NoShowRisk } | null = null;
  for (const appointment of items) {
    if (!isActiveBooking(appointment.status) || encaixeIds.has(appointment.id)) continue;
    const risk = risksById.get(appointment.id);
    if (!isHighRisk(risk)) continue;
    if (!best || risk.probability > best.risk.probability) {
      best = { anchor: appointment, risk };
    }
  }
  return best;
}

/**
 * Blocos que comportam um encaixe: têm âncora de risco alto, não foram
 * recusados e ainda não chegaram ao limite. Risco baixo ou médio nunca gera
 * sugestão. Função pura, em ordem de horário.
 */
export function findOverbookingOpportunities({
  appointments,
  risksById,
  overbookings,
  limit = MAX_OVERBOOKINGS_PER_BLOCK,
}: OpportunityInput): OverbookingOpportunity[] {
  const encaixeIds = encaixeAppointmentIds(overbookings);
  const opportunities: OverbookingOpportunity[] = [];

  for (const { block, items } of groupByBlock(appointments)) {
    const found = anchorOf(items, risksById, encaixeIds);
    if (!found) continue;

    const blockOverbookings = overbookingsOfBlock(overbookings, block);
    if (blockOverbookings.some((overbooking) => overbooking.decision === "recusada")) continue;

    const acceptedCount = acceptedCountOf(blockOverbookings);
    if (acceptedCount >= limit) continue;

    opportunities.push({ block, anchor: found.anchor, risk: found.risk, acceptedCount, limit });
  }

  return opportunities.sort(
    (a, b) => Date.parse(a.block.scheduledAt) - Date.parse(b.block.scheduledAt),
  );
}

type CandidateInput = {
  block: SlotBlock;
  appointments: readonly Appointment[];
  candidates: readonly RankableCandidate[];
  busyPatientIds: ReadonlySet<string>;
};

/**
 * Primeiro da lista de espera na mesma ordem do leilão, sem repetir quem já
 * está marcado no bloco nem quem tem oferta em aberto.
 */
export function pickEncaixeCandidate({
  block,
  appointments,
  candidates,
  busyPatientIds,
}: CandidateInput): EncaixeCandidate | null {
  const unavailable = new Set(busyPatientIds);
  for (const appointment of appointments) {
    if (isActiveBooking(appointment.status) && slotBlockOf(appointment).key === block.key) {
      unavailable.add(appointment.patientId);
    }
  }

  const [first] = rankCandidates(candidates, {
    specialty: block.specialty,
    alreadyOfferedWaitlistIds: new Set(),
    busyPatientIds: unavailable,
  });
  if (!first) return null;

  return {
    waitlistId: first.id,
    patientId: first.patientId,
    patientName: first.patientName,
    distanceKm: first.distanceKm,
    band: first.band,
  };
}

/** Sugestões prontas para a recepção: só blocos que têm a quem oferecer o encaixe. */
export function findOverbookingSuggestions(input: SuggestionInput): OverbookingSuggestion[] {
  return findOverbookingOpportunities(input).flatMap((opportunity) => {
    const candidate = pickEncaixeCandidate({
      block: opportunity.block,
      appointments: input.appointments,
      candidates: input.candidates,
      busyPatientIds: input.busyPatientIds,
    });
    return candidate ? [{ ...opportunity, candidate }] : [];
  });
}

export type DecisionCheckInput = {
  anchor: Appointment;
  risk: NoShowRisk | undefined;
  overbookings: readonly Overbooking[];
  limit?: number;
};

/**
 * Revalida a sugestão no momento da decisão: a agenda pode ter mudado desde
 * que a recepção abriu o painel.
 */
export function assertCanOverbook({
  anchor,
  risk,
  overbookings,
  limit = MAX_OVERBOOKINGS_PER_BLOCK,
}: DecisionCheckInput): OverbookingOpportunity {
  if (!isActiveBooking(anchor.status)) {
    throw new OverbookingError(
      "ANCHOR_NOT_ACTIVE",
      `O agendamento "${anchor.id}" não está ativo (status "${anchor.status}").`,
    );
  }
  if (encaixeAppointmentIds(overbookings).has(anchor.id)) {
    throw new OverbookingError(
      "ANCHOR_IS_ENCAIXE",
      `O agendamento "${anchor.id}" já é um encaixe e não motiva outro.`,
    );
  }
  if (!isHighRisk(risk)) {
    throw new OverbookingError(
      "NOT_HIGH_RISK",
      `O agendamento "${anchor.id}" não tem risco alto de falta.`,
    );
  }

  const block = slotBlockOf(anchor);
  const blockOverbookings = overbookingsOfBlock(overbookings, block);
  if (blockOverbookings.some((overbooking) => overbooking.decision === "recusada")) {
    throw new OverbookingError(
      "ALREADY_REFUSED",
      "A recepção já recusou o encaixe neste horário.",
    );
  }

  const acceptedCount = acceptedCountOf(blockOverbookings);
  if (acceptedCount >= limit) {
    throw new OverbookingError(
      "LIMIT_REACHED",
      `Este horário já atingiu o limite de ${limit} ${limit === 1 ? "encaixe" : "encaixes"}.`,
    );
  }

  return { block, anchor, risk, acceptedCount, limit };
}
