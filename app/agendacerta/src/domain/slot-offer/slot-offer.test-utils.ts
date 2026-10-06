import type { Appointment } from "../appointment";
import type { WaitlistEntry } from "../waitlist";
import type { RankableCandidate, SlotOffer } from "./types";

export const NOW = "2026-10-06T15:00:00.000Z";

export function slotAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-006",
    patientId: "pat-fabio",
    patientName: "Fábio Nunes",
    specialty: "Endocrinologia",
    scheduledAt: "2026-10-06T18:45:00.000Z",
    bookedAt: "2026-09-01T18:45:00.000Z",
    status: "liberado",
    phoneMasked: "(79) 9****-2211",
    procedure: { type: "consulta" },
    preparation: null,
    ...overrides,
  };
}

export function waitlistEntry(overrides: Partial<WaitlistEntry> = {}): WaitlistEntry {
  return {
    id: "wl-002",
    patientId: "pat-igor",
    patientName: "Igor Santos",
    specialty: "Endocrinologia",
    phoneMasked: "(79) 9****-5555",
    status: "aguardando",
    requestedAt: "2026-08-10T13:00:00.000Z",
    ...overrides,
  };
}

export function candidate(
  overrides: Partial<RankableCandidate> = {},
): RankableCandidate {
  return { ...waitlistEntry(), distanceKm: 3.7, ...overrides };
}

export function pendingOffer(overrides: Partial<SlotOffer> = {}): SlotOffer {
  return {
    id: "offer-1",
    appointmentId: "apt-006",
    candidate: { waitlistId: "wl-002", patientId: "pat-igor", patientName: "Igor Santos" },
    status: "pendente",
    offeredAt: NOW,
    expiresAt: "2026-10-06T15:15:00.000Z",
    closedAt: null,
    timeoutMinutes: 15,
    distanceKm: 3.7,
    ...overrides,
  };
}
