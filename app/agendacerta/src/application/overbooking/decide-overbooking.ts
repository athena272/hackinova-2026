import type { Appointment } from "@/domain/appointment";
import {
  assertCanOverbook,
  createEncaixe,
  OverbookingError,
  pickEncaixeCandidate,
  refuseOverbooking,
  type AcceptedOverbooking,
  type OverbookingDecisionInput,
  type RefusedOverbooking,
} from "@/domain/overbooking";
import { AppointmentNotFoundError, WaitlistNotFoundError } from "@/repository/errors";
import type { OverbookingDeps } from "./deps";
import { loadCandidates, loadOverbookingContext } from "./load-overbooking-context";

export type DecideOverbookingResult =
  | { decision: "aceitar"; overbooking: AcceptedOverbooking; appointment: Appointment }
  | { decision: "recusar"; overbooking: RefusedOverbooking };

/**
 * Decisão da recepção sobre o encaixe sugerido no bloco do agendamento
 * `anchorId`. Antes de gravar, refaz as contas: o risco, o limite e a fila
 * podem ter mudado desde que o painel carregou.
 */
export async function decideOverbooking(
  deps: OverbookingDeps,
  anchorId: string,
  decision: OverbookingDecisionInput,
): Promise<DecideOverbookingResult> {
  const context = await loadOverbookingContext(deps);
  const anchor = context.appointments.find((appointment) => appointment.id === anchorId);
  if (!anchor) throw new AppointmentNotFoundError(anchorId);

  const opportunity = assertCanOverbook({
    anchor,
    risk: context.risksById.get(anchorId),
    overbookings: context.overbookings,
  });
  const decidedAt = deps.now().toISOString();

  if (decision === "recusar") {
    const refusal = refuseOverbooking({
      opportunity,
      overbookingId: deps.newOverbookingId(),
      decidedAt,
    });
    return { decision, overbooking: await deps.overbookings.saveRefusal(refusal) };
  }

  const picked = pickEncaixeCandidate({
    block: opportunity.block,
    appointments: context.appointments,
    candidates: await loadCandidates(deps, [anchor.specialty], context.distanceFor),
    busyPatientIds: context.busyPatientIds,
  });
  if (!picked) {
    throw new OverbookingError(
      "NO_CANDIDATES",
      `Ninguém na lista de espera de ${anchor.specialty} pode receber o encaixe agora.`,
    );
  }

  const candidate = await deps.waitlist.getById(picked.waitlistId);
  if (!candidate) throw new WaitlistNotFoundError(picked.waitlistId);

  const encaixe = createEncaixe({
    opportunity,
    candidate,
    encaixeId: deps.newEncaixeId(),
    overbookingId: deps.newOverbookingId(),
    decidedAt,
  });
  const overbooking = await deps.overbookings.saveAcceptance(encaixe);
  return { decision, overbooking, appointment: encaixe.appointment };
}
