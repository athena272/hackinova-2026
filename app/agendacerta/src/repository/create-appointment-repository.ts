import type { AppointmentRepository } from "./appointment-repository";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";
import { SupabaseAppointmentRepository } from "./supabase-appointment-repository";
import { hasSupabaseConfig } from "@/lib/supabase/admin";

/**
 * Usa Supabase quando URL + service role estão definidos.
 * Sem isso, cai no seed em memória (útil para testes unitários / CI sem Docker).
 */
export function createAppointmentRepository(): AppointmentRepository {
  if (hasSupabaseConfig()) {
    return new SupabaseAppointmentRepository();
  }
  return new InMemoryAppointmentRepository();
}

export { AppointmentNotFoundError } from "./errors";
