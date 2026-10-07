import {
  blockKey,
  type AcceptedOverbooking,
  type CreateEncaixeResult,
  type Overbooking,
  type RefusedOverbooking,
} from "@/domain/overbooking";
import type { AppointmentRepository } from "./appointment-repository";
import { OverbookingConflictError } from "./errors";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";
import { InMemoryWaitlistRepository } from "./in-memory-waitlist-repository";
import type { OverbookingRepository } from "./overbooking-repository";
import type { WaitlistRepository } from "./waitlist-repository";

type Store = {
  overbookings: Map<string, Overbooking>;
};

const GLOBAL_KEY = "__agendacerta_overbooking_store__";

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };

  if (!globalRef[GLOBAL_KEY]) {
    globalRef[GLOBAL_KEY] = { overbookings: new Map() };
  }

  return globalRef[GLOBAL_KEY];
}

/** Reproduz o id primário e os índices únicos parciais do banco. */
function clashes(existing: Overbooking, next: Overbooking): boolean {
  if (existing.id === next.id) return true;
  if (existing.decision !== next.decision) return false;
  const sameBlock =
    blockKey(existing.specialty, existing.scheduledAt) === blockKey(next.specialty, next.scheduledAt);
  if (!sameBlock) return false;
  return next.decision === "recusada" || existing.sequence === next.sequence;
}

function byScheduledAt(a: Overbooking, b: Overbooking): number {
  return (
    Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) ||
    Date.parse(a.decidedAt) - Date.parse(b.decidedAt) ||
    a.id.localeCompare(b.id)
  );
}

export class InMemoryOverbookingRepository implements OverbookingRepository {
  constructor(
    private readonly appointments: AppointmentRepository = new InMemoryAppointmentRepository(),
    private readonly waitlist: WaitlistRepository = new InMemoryWaitlistRepository(),
  ) {}

  async list(): Promise<Overbooking[]> {
    return Array.from(getStore().overbookings.values())
      .sort(byScheduledAt)
      .map((overbooking) => ({ ...overbooking }));
  }

  /** Valida tudo antes da primeira escrita, para não deixar gravação pela metade. */
  async saveAcceptance({
    appointment,
    candidate,
    overbooking,
  }: CreateEncaixeResult): Promise<AcceptedOverbooking> {
    this.assertNoClash(overbooking);
    const current = await this.waitlist.getById(candidate.id);
    if (current?.status !== "aguardando") {
      throw new OverbookingConflictError(overbooking.id);
    }

    await this.appointments.create(appointment);
    await this.waitlist.saveAssigned(candidate);
    getStore().overbookings.set(overbooking.id, { ...overbooking });
    return { ...overbooking };
  }

  async saveRefusal(refusal: RefusedOverbooking): Promise<RefusedOverbooking> {
    this.assertNoClash(refusal);
    getStore().overbookings.set(refusal.id, { ...refusal });
    return { ...refusal };
  }

  private assertNoClash(next: Overbooking): void {
    for (const existing of getStore().overbookings.values()) {
      if (clashes(existing, next)) throw new OverbookingConflictError(next.id);
    }
  }
}

/** Apenas para testes: apaga todas as decisões. */
export function resetOverbookingStoreForTests(): void {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };
  delete globalRef[GLOBAL_KEY];
}
