import type { Appointment, ClinicUnit } from "../appointment";
import type { OpenDuplicateCheck, ResolvedDuplicateCheck } from "./types";

export const SENT_AT = "2026-09-21T12:00:00.000Z";
export const RESOLVED_AT = "2026-09-21T13:00:00.000Z";

export const JARDINS: ClinicUnit = { id: "unit-jardins", name: "Unidade Jardins" };
export const CENTRO: ClinicUnit = { id: "unit-centro", name: "Unidade Centro" };

/** Data às 13h UTC (10h em Aracaju) do dia informado de setembro de 2026. */
export function september(day: number): string {
  return `2026-09-${String(day).padStart(2, "0")}T13:00:00.000Z`;
}

export function booking(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-a",
    patientId: "pat-bruno",
    patientName: "Bruno Lima",
    specialty: "Endocrinologia",
    scheduledAt: september(22),
    bookedAt: "2026-09-01T13:00:00.000Z",
    status: "pendente",
    phoneMasked: "(79) 9****-5678",
    procedure: { type: "consulta" },
    preparation: null,
    unit: JARDINS,
    returnOfAppointmentId: null,
    ...overrides,
  };
}

export function openCheck(overrides: Partial<OpenDuplicateCheck> = {}): OpenDuplicateCheck {
  return {
    id: "dup-1",
    patientId: "pat-bruno",
    groupKey: "apt-a,apt-b",
    appointmentIds: ["apt-a", "apt-b"],
    status: "aguardando",
    sentAt: SENT_AT,
    keptAppointmentId: null,
    resolvedAt: null,
    ...overrides,
  };
}

export function resolvedCheck(
  overrides: Partial<ResolvedDuplicateCheck> = {},
): ResolvedDuplicateCheck {
  return {
    ...openCheck(),
    status: "resolvida",
    keptAppointmentId: "apt-a",
    resolvedAt: RESOLVED_AT,
    ...overrides,
  };
}
