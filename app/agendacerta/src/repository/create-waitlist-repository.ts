import { hasSupabaseConfig } from "@/lib/supabase/admin";
import { InMemoryWaitlistRepository } from "./in-memory-waitlist-repository";
import { SupabaseWaitlistRepository } from "./supabase-waitlist-repository";
import type { WaitlistRepository } from "./waitlist-repository";

/**
 * Usa Supabase quando URL + service role estão definidos.
 * Sem isso, cai no seed em memória.
 */
export function createWaitlistRepository(): WaitlistRepository {
  if (hasSupabaseConfig()) {
    return new SupabaseWaitlistRepository();
  }
  return new InMemoryWaitlistRepository();
}

export { WaitlistNotFoundError } from "./errors";
