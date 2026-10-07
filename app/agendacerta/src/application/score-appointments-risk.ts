import type { Appointment } from "@/domain/appointment";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import {
  calculateNoShowRisk,
  isRiskScorable,
  type NoShowRisk,
} from "@/domain/no-show-risk";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import type { PatientRepository } from "@/repository/patient-repository";
import { loadPatientDistances, type PatientDistanceLookup } from "./patient-distance";

function groupByPatient(
  appointments: readonly Appointment[],
): Map<string, Appointment[]> {
  const groups = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    const group = groups.get(appointment.patientId);
    if (group) {
      group.push(appointment);
    } else {
      groups.set(appointment.patientId, [appointment]);
    }
  }
  return groups;
}

/**
 * Calcula o risco de falta de cada consulta ainda por acontecer (pendente ou
 * confirmada), usando o histórico do próprio paciente e a distância até a clínica.
 */
export async function scoreAppointmentsRisk(
  appointmentRepo: AppointmentRepository,
  patientRepo: PatientRepository,
  clinicNeighborhoodId: string = CLINIC_NEIGHBORHOOD_ID,
): Promise<NoShowRisk[]> {
  const [appointments, distanceFor] = await Promise.all([
    appointmentRepo.list(),
    loadPatientDistances(patientRepo, clinicNeighborhoodId, "scoreAppointmentsRisk"),
  ]);
  return scoreRisks(appointments, distanceFor);
}

/** Mesma conta, para quem já carregou a agenda e as distâncias. */
export function scoreRisks(
  appointments: readonly Appointment[],
  distanceFor: PatientDistanceLookup,
): NoShowRisk[] {
  const historyByPatient = groupByPatient(appointments);

  return appointments
    .filter((appointment) => isRiskScorable(appointment.status))
    .map((appointment) =>
      calculateNoShowRisk({
        appointment,
        history: historyByPatient.get(appointment.patientId) ?? [],
        distanceKm: distanceFor(appointment.patientId),
      }),
    );
}
