import type { WaitlistEntry } from "@/domain/waitlist";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  formatAssignWaitlistError,
  formatGetWaitlistError,
  formatListWaitlistError,
} from "@/lib/supabase/errors";
import { WaitlistNotFoundError } from "./errors";
import { mapRowToWaitlistEntry, type WaitlistRow } from "./mappers";
import type { WaitlistRepository } from "./waitlist-repository";

export class SupabaseWaitlistRepository implements WaitlistRepository {
  async listBySpecialty(specialty: string): Promise<WaitlistEntry[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, patient_name, specialty, phone_masked, status")
      .eq("specialty", specialty)
      .eq("status", "aguardando")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(formatListWaitlistError(error.message));
    }

    return (data as WaitlistRow[]).map(mapRowToWaitlistEntry);
  }

  async getById(id: string): Promise<WaitlistEntry | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, patient_name, specialty, phone_masked, status")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(formatGetWaitlistError(error.message));
    }

    if (!data) {
      return null;
    }

    return mapRowToWaitlistEntry(data as WaitlistRow);
  }

  async saveAssigned(entry: WaitlistEntry): Promise<WaitlistEntry> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("waitlist")
      .update({ status: entry.status })
      .eq("id", entry.id)
      .select("id, patient_name, specialty, phone_masked, status")
      .single();

    if (error) {
      throw new Error(formatAssignWaitlistError(error.message));
    }

    if (!data) {
      throw new WaitlistNotFoundError(entry.id);
    }

    return mapRowToWaitlistEntry(data as WaitlistRow);
  }
}
