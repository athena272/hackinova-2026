import { isActiveBooking } from "@/domain/appointment";
import type {
  DuplicateCheck,
  DuplicateCheckResolution,
  OpenDuplicateCheck,
  ResolvedDuplicateCheck,
} from "@/domain/duplicate-booking";
import type { AppointmentRepository } from "./appointment-repository";
import type { DuplicateCheckRepository } from "./duplicate-check-repository";
import { DuplicateCheckConflictError } from "./errors";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";

type Store = {
  checks: Map<string, DuplicateCheck>;
};

const GLOBAL_KEY = "__agendacerta_duplicate_check_store__";

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };

  if (!globalRef[GLOBAL_KEY]) {
    globalRef[GLOBAL_KEY] = { checks: new Map() };
  }

  return globalRef[GLOBAL_KEY];
}

function cloneCheck<T extends DuplicateCheck>(check: T): T {
  return { ...check, appointmentIds: [...check.appointmentIds] };
}

function bySentAt(a: DuplicateCheck, b: DuplicateCheck): number {
  return Date.parse(a.sentAt) - Date.parse(b.sentAt) || a.id.localeCompare(b.id);
}

export class InMemoryDuplicateCheckRepository implements DuplicateCheckRepository {
  constructor(
    private readonly appointments: AppointmentRepository = new InMemoryAppointmentRepository(),
  ) {}

  async list(): Promise<DuplicateCheck[]> {
    return Array.from(getStore().checks.values()).sort(bySentAt).map(cloneCheck);
  }

  async getById(id: string): Promise<DuplicateCheck | null> {
    const found = getStore().checks.get(id);
    return found ? cloneCheck(found) : null;
  }

  /** Reproduz o id primário e o índice único parcial (uma confirmação aguardando por grupo). */
  async create(check: OpenDuplicateCheck): Promise<OpenDuplicateCheck> {
    for (const existing of getStore().checks.values()) {
      const sameOpenGroup = existing.status === "aguardando" && existing.groupKey === check.groupKey;
      if (existing.id === check.id || sameOpenGroup) {
        throw new DuplicateCheckConflictError(check.id);
      }
    }
    getStore().checks.set(check.id, cloneCheck(check));
    return cloneCheck(check);
  }

  /** Valida tudo antes da primeira escrita, para não deixar gravação pela metade. */
  async resolve({ check, kept, released }: DuplicateCheckResolution): Promise<ResolvedDuplicateCheck> {
    if (getStore().checks.get(check.id)?.status !== "aguardando") {
      throw new DuplicateCheckConflictError(check.id);
    }
    const current = await Promise.all(
      [kept, ...released].map(({ id }) => this.appointments.getById(id)),
    );
    if (current.some((appointment) => !appointment || !isActiveBooking(appointment.status))) {
      throw new DuplicateCheckConflictError(check.id);
    }

    if (current[0]?.status === "pendente") {
      await this.appointments.confirm(kept.id, "SIM");
    }
    for (const appointment of released) {
      await this.appointments.saveReleased(appointment);
    }
    getStore().checks.set(check.id, cloneCheck(check));
    return cloneCheck(check);
  }
}

/** Apenas para testes: apaga todas as confirmações. */
export function resetDuplicateCheckStoreForTests(): void {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };
  delete globalRef[GLOBAL_KEY];
}
