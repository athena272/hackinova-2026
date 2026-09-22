import type { WaitlistEntry } from "@/domain/waitlist";

export interface WaitlistRepository {
  listBySpecialty(specialty: string): Promise<WaitlistEntry[]>;
  getById(id: string): Promise<WaitlistEntry | null>;
  /** Persiste candidato já transformado por offerSlot (status atribuido). */
  saveAssigned(entry: WaitlistEntry): Promise<WaitlistEntry>;
}
