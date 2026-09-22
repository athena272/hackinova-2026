import type { Appointment, ConfirmationAction } from "@/domain/appointment";
import { applyConfirmationAction } from "@/domain/confirmation";
import { loadAppointmentSeed } from "@/data/seed";
import type { AppointmentRepository } from "./appointment-repository";
import { AppointmentNotFoundError } from "./errors";

export { AppointmentNotFoundError };

type Store = {
  appointments: Map<string, Appointment>;
};

const GLOBAL_KEY = "__agendacerta_appointment_store__";

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };

  if (!globalRef[GLOBAL_KEY]) {
    const appointments = new Map<string, Appointment>();
    for (const item of loadAppointmentSeed()) {
      appointments.set(item.id, { ...item });
    }
    globalRef[GLOBAL_KEY] = { appointments };
  }

  return globalRef[GLOBAL_KEY];
}

export class InMemoryAppointmentRepository implements AppointmentRepository {
  async list(): Promise<Appointment[]> {
    const { appointments } = getStore();
    return Array.from(appointments.values()).sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt),
    );
  }

  async getById(id: string): Promise<Appointment | null> {
    const { appointments } = getStore();
    const found = appointments.get(id);
    return found ? { ...found } : null;
  }

  async confirm(id: string, action: ConfirmationAction): Promise<Appointment> {
    const { appointments } = getStore();
    const current = appointments.get(id);

    if (!current) {
      throw new AppointmentNotFoundError(id);
    }

    const nextStatus = applyConfirmationAction(current.status, action);
    const updated: Appointment = { ...current, status: nextStatus };
    appointments.set(id, updated);
    return { ...updated };
  }

  async saveOffered(appointment: Appointment): Promise<Appointment> {
    const { appointments } = getStore();
    if (!appointments.has(appointment.id)) {
      throw new AppointmentNotFoundError(appointment.id);
    }
    const saved: Appointment = { ...appointment };
    appointments.set(appointment.id, saved);
    return { ...saved };
  }
}

/** Apenas para testes: reinicia o store a partir do seed. */
export function resetAppointmentStoreForTests(): void {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };
  delete globalRef[GLOBAL_KEY];
  getStore();
}
