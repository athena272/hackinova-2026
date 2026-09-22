import { loadWaitlistSeed } from "@/data/waitlist-seed";
import type { WaitlistEntry } from "@/domain/waitlist";
import { WaitlistNotFoundError } from "./errors";
import type { WaitlistRepository } from "./waitlist-repository";

type Store = {
  entries: Map<string, WaitlistEntry>;
};

const GLOBAL_KEY = "__agendacerta_waitlist_store__";

function getStore(): Store {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };

  if (!globalRef[GLOBAL_KEY]) {
    const entries = new Map<string, WaitlistEntry>();
    for (const item of loadWaitlistSeed()) {
      entries.set(item.id, { ...item });
    }
    globalRef[GLOBAL_KEY] = { entries };
  }

  return globalRef[GLOBAL_KEY];
}

export class InMemoryWaitlistRepository implements WaitlistRepository {
  async listBySpecialty(specialty: string): Promise<WaitlistEntry[]> {
    const { entries } = getStore();
    return Array.from(entries.values())
      .filter(
        (entry) =>
          entry.specialty === specialty && entry.status === "aguardando",
      )
      .map((entry) => ({ ...entry }));
  }

  async getById(id: string): Promise<WaitlistEntry | null> {
    const { entries } = getStore();
    const found = entries.get(id);
    return found ? { ...found } : null;
  }

  async saveAssigned(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const { entries } = getStore();
    if (!entries.has(entry.id)) {
      throw new WaitlistNotFoundError(entry.id);
    }
    const saved: WaitlistEntry = { ...entry };
    entries.set(entry.id, saved);
    return { ...saved };
  }
}

/** Apenas para testes: reinicia o store a partir do seed. */
export function resetWaitlistStoreForTests(): void {
  const globalRef = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Store;
  };
  delete globalRef[GLOBAL_KEY];
  getStore();
}
