import { isActiveBooking, type Appointment } from "../appointment";
import { DUPLICATE_WINDOW_MS, groupKeyOf, serviceKeyOf } from "./duplicate-rules";
import type { DuplicateGroup } from "./types";

/**
 * Retorno legítimo: aponta para um agendamento do mesmo paciente e do mesmo
 * serviço, ainda ativo ou já no histórico. Vínculo para outro paciente ou
 * serviço é dado inconsistente e não protege da detecção.
 */
export function isLegitimateReturn(
  appointment: Appointment,
  byId: ReadonlyMap<string, Appointment>,
): boolean {
  if (appointment.returnOfAppointmentId === null) return false;
  const origin = byId.get(appointment.returnOfAppointmentId);
  return (
    origin !== undefined &&
    origin.id !== appointment.id &&
    origin.patientId === appointment.patientId &&
    serviceKeyOf(origin) === serviceKeyOf(appointment)
  );
}

function byScheduleThenId(a: Appointment, b: Appointment): number {
  return Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt) || a.id.localeCompare(b.id);
}

/** Horários seguidos a até a janela entre si ficam no mesmo grupo (A-B e B-C viram A-B-C). */
function chainWithinWindow(sorted: readonly Appointment[]): Appointment[][] {
  const clusters: Appointment[][] = [];
  for (const appointment of sorted) {
    const current = clusters.at(-1);
    const previous = current?.at(-1);
    if (
      current &&
      previous &&
      Date.parse(appointment.scheduledAt) - Date.parse(previous.scheduledAt) <= DUPLICATE_WINDOW_MS
    ) {
      current.push(appointment);
    } else {
      clusters.push([appointment]);
    }
  }
  return clusters;
}

function toGroup(appointments: Appointment[]): DuplicateGroup {
  const [first] = appointments;
  return {
    key: groupKeyOf(appointments.map((appointment) => appointment.id)),
    patientId: first.patientId,
    patientName: first.patientName,
    specialty: first.specialty,
    procedure: first.procedure,
    appointments,
  };
}

/**
 * Possíveis bookings duplos: mesmo paciente, mesmo serviço (especialidade da
 * consulta ou nome do exame), horários ativos em datas próximas. Unidades
 * diferentes não impedem a detecção. Retorno legítimo nunca entra.
 * Função pura: a ordem do resultado não depende da ordem de entrada.
 */
export function findDuplicateGroups(appointments: readonly Appointment[]): DuplicateGroup[] {
  const byId = new Map(appointments.map((appointment) => [appointment.id, appointment]));
  const buckets = new Map<string, Appointment[]>();

  for (const appointment of appointments) {
    if (!isActiveBooking(appointment.status) || isLegitimateReturn(appointment, byId)) continue;
    const bucketKey = `${appointment.patientId}|${serviceKeyOf(appointment)}`;
    const bucket = buckets.get(bucketKey);
    if (bucket) {
      bucket.push(appointment);
    } else {
      buckets.set(bucketKey, [appointment]);
    }
  }

  return [...buckets.values()]
    .flatMap((bucket) => chainWithinWindow([...bucket].sort(byScheduleThenId)))
    .filter((cluster) => cluster.length >= 2)
    .map(toGroup)
    .sort(
      (a, b) => byScheduleThenId(a.appointments[0], b.appointments[0]) || a.key.localeCompare(b.key),
    );
}

/** O grupo detectado com exatamente estes horários, ou null. */
export function findGroupByAppointmentIds(
  groups: readonly DuplicateGroup[],
  appointmentIds: readonly string[],
): DuplicateGroup | null {
  const key = groupKeyOf(appointmentIds);
  return groups.find((group) => group.key === key) ?? null;
}
