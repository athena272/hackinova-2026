import { DISTANCE_BANDS } from "./offer-rules";
import type { DistanceBand, RankableCandidate, RankedCandidate } from "./types";

const BAND_ORDER: Record<DistanceBand, number> = {
  perto: 0,
  medio: 1,
  longe: 2,
  desconhecida: 3,
};

export function distanceBandFor(distanceKm: number | null): DistanceBand {
  if (distanceKm === null) return "desconhecida";
  if (distanceKm <= DISTANCE_BANDS.pertoAteKm) return "perto";
  if (distanceKm <= DISTANCE_BANDS.medioAteKm) return "medio";
  return "longe";
}

export type RankingContext = {
  specialty: string;
  /** Candidatos que já receberam oferta desta vaga: ninguém recebe a mesma vaga duas vezes. */
  alreadyOfferedWaitlistIds: ReadonlySet<string>;
  /** Pacientes com oferta em aberto em outra vaga: nunca duas ofertas ao mesmo tempo. */
  busyPatientIds: ReadonlySet<string>;
};

function compareCandidates(a: RankedCandidate, b: RankedCandidate): number {
  return (
    BAND_ORDER[a.band] - BAND_ORDER[b.band] ||
    Date.parse(a.requestedAt) - Date.parse(b.requestedAt) ||
    a.id.localeCompare(b.id)
  );
}

/**
 * Ordem da oferta em cascata: primeiro a faixa de distância até a clínica
 * (perto, médio, longe, desconhecida), depois quem espera há mais tempo,
 * e por fim o id, para a ordem ser estável. Função pura.
 */
export function rankCandidates(
  candidates: readonly RankableCandidate[],
  context: RankingContext,
): RankedCandidate[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.specialty === context.specialty &&
        candidate.status === "aguardando" &&
        !context.alreadyOfferedWaitlistIds.has(candidate.id) &&
        !context.busyPatientIds.has(candidate.patientId),
    )
    .map((candidate) => ({ ...candidate, band: distanceBandFor(candidate.distanceKm) }))
    .sort(compareCandidates);
}
