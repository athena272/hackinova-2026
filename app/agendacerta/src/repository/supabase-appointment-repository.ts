import type { Appointment, ConfirmationAction } from "@/domain/appointment";
import { applyConfirmationAction } from "@/domain/confirmation";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  formatConfirmAppointmentError,
  formatGetAppointmentError,
  formatListAppointmentsError,
} from "@/lib/supabase/errors";
import type { AppointmentRepository } from "./appointment-repository";
import { AppointmentNotFoundError } from "./errors";
import { mapRowToAppointment, type AppointmentRow } from "./mappers";

export class SupabaseAppointmentRepository implements AppointmentRepository {
  async list(): Promise<Appointment[]> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, patient_name, specialty, scheduled_at, status, phone_masked",
      )
      .order("scheduled_at", { ascending: true });

    if (error) {
      throw new Error(formatListAppointmentsError(error.message));
    }

    return (data as AppointmentRow[]).map(mapRowToAppointment);
  }

  async getById(id: string): Promise<Appointment | null> {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, patient_name, specialty, scheduled_at, status, phone_masked",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(formatGetAppointmentError(error.message));
    }

    if (!data) {
      return null;
    }

    return mapRowToAppointment(data as AppointmentRow);
  }

  async confirm(id: string, action: ConfirmationAction): Promise<Appointment> {
    const current = await this.getById(id);
    if (!current) {
      throw new AppointmentNotFoundError(id);
    }

    const nextStatus = applyConfirmationAction(current.status, action);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("appointments")
      .update({ status: nextStatus })
      .eq("id", id)
      .select(
        "id, patient_name, specialty, scheduled_at, status, phone_masked",
      )
      .single();

    if (error) {
      throw new Error(formatConfirmAppointmentError(error.message));
    }

    return mapRowToAppointment(data as AppointmentRow);
  }
}
