import type { Appointment } from "@/domain/appointment";
import { CLINIC_NEIGHBORHOOD_ID } from "@/domain/clinic";
import {
  calculateNoShowRisk,
  distanceInKm,
  isRiskScorable,
  type NoShowRisk,
} from "@/domain/no-show-risk";
import type { Neighborhood } from "@/domain/patient";
import type { AppointmentRepository } from "@/repository/appointment-repository";
import type { PatientRepository } from "@/repository/patient-repository";

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
  const [appointments, locations, clinic] = await Promise.all([
    appointmentRepo.list(),
    patientRepo.listLocations(),
    patientRepo.getNeighborhood(clinicNeighborhoodId),
  ]);

  if (!clinic) {
    console.error(
      `[scoreAppointmentsRisk] bairro da clínica "${clinicNeighborhoodId}" não encontrado; distância tratada como desconhecida.`,
    );
  }

  const neighborhoodByPatient = new Map<string, Neighborhood | null>(
    locations.map((location) => [location.patientId, location.neighborhood]),
  );
  const historyByPatient = groupByPatient(appointments);

  const distanceFor = (patientId: string): number | null => {
    const home = neighborhoodByPatient.get(patientId);
    return clinic && home ? distanceInKm(home, clinic) : null;
  };

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
