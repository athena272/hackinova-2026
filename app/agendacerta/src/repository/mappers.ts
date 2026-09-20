import type { Appointment, AppointmentStatus } from "@/domain/appointment";

export type AppointmentRow = {
  id: string;
  patient_name: string;
  specialty: string;
  scheduled_at: string;
  status: AppointmentStatus;
  phone_masked: string;
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
