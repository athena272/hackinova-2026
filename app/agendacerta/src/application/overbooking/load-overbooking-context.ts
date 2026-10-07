import type { Appointment } from "@/domain/appointment";
import type { NoShowRisk } from "@/domain/no-show-risk";
import type { Overbooking } from "@/domain/overbooking";
import type { RankableCandidate, SlotOffer } from "@/domain/slot-offer";
import { loadPatientDistances, type PatientDistanceLookup } from "../patient-distance";
import { scoreRisks } from "../score-appointments-risk";
import type { OverbookingDeps } from "./deps";

export type OverbookingContext = {
  appointments: Appointment[];
  risksById: Map<string, NoShowRisk>;
  overbookings: Overbooking[];
  pendingOffers: SlotOffer[];
  /** Pacientes com oferta de vaga em aberto. */
  busyPatientIds: Set<string>;
  distanceFor: PatientDistanceLookup;
};

/** Tudo o que a listagem e a decisão precisam, lido uma vez. */
export async function loadOverbookingContext(deps: OverbookingDeps): Promise<OverbookingContext> {
  const [appointments, overbookings, pendingOffers, distanceFor] = await Promise.all([
    deps.appointments.list(),
    deps.overbookings.list(),
    deps.offers.listPending(),
    loadPatientDistances(deps.patients, deps.clinicNeighborhoodId, "overbooking"),
  ]);

  const risks = scoreRisks(appointments, distanceFor);
  return {
    appointments,
    risksById: new Map(risks.map((risk) => [risk.appointmentId, risk])),
    overbookings,
    pendingOffers,
    busyPatientIds: new Set(pendingOffers.map((offer) => offer.candidate.patientId)),
    distanceFor,
  };
}

/** Lista de espera das especialidades pedidas, com a distância usada na ordem do leilão. */
export async function loadCandidates(
  deps: OverbookingDeps,
  specialties: Iterable<string>,
  distanceFor: PatientDistanceLookup,
): Promise<RankableCandidate[]> {
  const lists = await Promise.all(
    [...new Set(specialties)].map((specialty) => deps.waitlist.listBySpecialty(specialty)),
  );
  return lists.flat().map((entry) => ({ ...entry, distanceKm: distanceFor(entry.patientId) }));
}
