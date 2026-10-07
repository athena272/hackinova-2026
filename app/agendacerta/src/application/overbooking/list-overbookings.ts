import {
  coveredAppointmentIds,
  encaixeAppointmentIds,
  findOverbookingOpportunities,
  findOverbookingSuggestions,
  type OverbookingOverview,
} from "@/domain/overbooking";
import type { OverbookingDeps } from "./deps";
import { loadCandidates, loadOverbookingContext } from "./load-overbooking-context";

export async function listOverbookings(deps: OverbookingDeps): Promise<OverbookingOverview> {
  const context = await loadOverbookingContext(deps);
  const specialties = findOverbookingOpportunities(context).map(
    (opportunity) => opportunity.block.specialty,
  );
  const candidates = await loadCandidates(deps, specialties, context.distanceFor);

  return {
    suggestions: findOverbookingSuggestions({ ...context, candidates }),
    encaixeAppointmentIds: [...encaixeAppointmentIds(context.overbookings)],
    coveredAppointmentIds: [...coveredAppointmentIds(context)],
  };
}
