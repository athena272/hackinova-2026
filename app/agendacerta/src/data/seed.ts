import seedData from "../../data/appointments.seed.json";
import type { Appointment } from "@/domain/appointment";

export function loadAppointmentSeed(): Appointment[] {
  return seedData.map((item) => ({ ...item })) as Appointment[];
}
