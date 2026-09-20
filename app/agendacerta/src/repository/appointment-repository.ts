import type { Appointment, ConfirmationAction } from "@/domain/appointment";

export interface AppointmentRepository {
  list(): Promise<Appointment[]>;
  getById(id: string): Promise<Appointment | null>;
  confirm(id: string, action: ConfirmationAction): Promise<Appointment>;
}
