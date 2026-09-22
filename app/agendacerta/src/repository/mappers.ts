import type { Appointment, AppointmentStatus } from "@/domain/appointment";
import type { WaitlistEntry, WaitlistStatus } from "@/domain/waitlist";

export type AppointmentRow = {
  id: string;
  patient_name: string;
  specialty: string;
  scheduled_at: string;
  status: AppointmentStatus;
  phone_masked: string;
};

export type WaitlistRow = {
  id: string;
  patient_name: string;
  specialty: string;
  phone_masked: string;
  status: WaitlistStatus;
};

export function mapRowToAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    patientName: row.patient_name,
    specialty: row.specialty,
    scheduledAt: row.scheduled_at,
    status: row.status,
    phoneMasked: row.phone_masked,
  };
}

export function mapRowToWaitlistEntry(row: WaitlistRow): WaitlistEntry {
  return {
    id: row.id,
    patientName: row.patient_name,
    specialty: row.specialty,
    phoneMasked: row.phone_masked,
    status: row.status,
  };
}
