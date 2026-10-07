import { isActiveBooking, isSlotReusable, type Appointment } from "../appointment";
import { DuplicateBookingError } from "./errors";
import type {
  DuplicateAlert,
  DuplicateBookingOverview,
  DuplicateCheck,
  DuplicateCheckResolution,
  DuplicateGroup,
  OpenDuplicateCheck,
} from "./types";

/**
 * Confirmação aberta que ainda faz sentido: pelo menos dois dos horários
 * perguntados continuam ativos. Se o paciente já desmarcou um pela confirmação
 * normal, a pergunta perde o sentido e não bloqueia um envio novo.
 */
export function isEffectiveOpenCheck(
  check: DuplicateCheck,
  activeAppointmentIds: ReadonlySet<string>,
): check is OpenDuplicateCheck {
  return (
    check.status === "aguardando" &&
    check.appointmentIds.filter((id) => activeAppointmentIds.has(id)).length >= 2
  );
}

export function activeAppointmentIdsOf(appointments: readonly Appointment[]): Set<string> {
  return new Set(
    appointments
      .filter((appointment) => isActiveBooking(appointment.status))
      .map((appointment) => appointment.id),
  );
}

function openCheckSharing(
  group: DuplicateGroup,
  checks: readonly DuplicateCheck[],
  activeAppointmentIds: ReadonlySet<string>,
): OpenDuplicateCheck | null {
  const groupIds = new Set(group.appointments.map((appointment) => appointment.id));
  return (
    checks.find(
      (check): check is OpenDuplicateCheck =>
        isEffectiveOpenCheck(check, activeAppointmentIds) &&
        check.appointmentIds.some((id) => groupIds.has(id)),
    ) ?? null
  );
}

export type StartDuplicateCheckInput = {
  group: DuplicateGroup;
  checks: readonly DuplicateCheck[];
  appointments: readonly Appointment[];
  id: string;
  sentAt: string;
};

/** Monta a confirmação reforçada de um grupo detectado. Função pura. */
export function startDuplicateCheck({
  group,
  checks,
  appointments,
  id,
  sentAt,
}: StartDuplicateCheckInput): OpenDuplicateCheck {
  if (openCheckSharing(group, checks, activeAppointmentIdsOf(appointments))) {
    throw new DuplicateBookingError(
      "ALREADY_SENT",
      `A confirmação reforçada de ${group.patientName} já foi enviada e aguarda resposta.`,
    );
  }

  return {
    id,
    patientId: group.patientId,
    groupKey: group.key,
    appointmentIds: group.appointments.map((appointment) => appointment.id),
    status: "aguardando",
    sentAt,
    keptAppointmentId: null,
    resolvedAt: null,
  };
}

export type ResolveDuplicateCheckInput = {
  check: DuplicateCheck;
  appointments: readonly Appointment[];
  keepAppointmentId: string;
  resolvedAt: string;
};

/**
 * Aplica a escolha do paciente: o horário mantido fica confirmado e os outros
 * horários ainda ativos viram vaga reaproveitável. Função pura.
 */
export function resolveDuplicateCheck({
  check,
  appointments,
  keepAppointmentId,
  resolvedAt,
}: ResolveDuplicateCheckInput): DuplicateCheckResolution {
  if (check.status !== "aguardando") {
    throw new DuplicateBookingError(
      "CHECK_NOT_OPEN",
      "O paciente já escolheu qual horário manter nesta confirmação.",
    );
  }
  if (!check.appointmentIds.includes(keepAppointmentId)) {
    throw new DuplicateBookingError(
      "APPOINTMENT_NOT_IN_CHECK",
      `O agendamento "${keepAppointmentId}" não faz parte desta confirmação.`,
    );
  }

  const inCheck = new Set(check.appointmentIds);
  const active = appointments.filter(
    (appointment) => inCheck.has(appointment.id) && isActiveBooking(appointment.status),
  );
  const kept = active.find((appointment) => appointment.id === keepAppointmentId);
  if (!kept) {
    throw new DuplicateBookingError(
      "APPOINTMENT_NOT_ACTIVE",
      `O agendamento "${keepAppointmentId}" não está mais ativo.`,
    );
  }
  if (active.length < 2) {
    throw new DuplicateBookingError(
      "GROUP_DISSOLVED",
      "Só sobrou um horário ativo nesta confirmação; não há o que escolher.",
    );
  }

  return {
    check: { ...check, status: "resolvida", keptAppointmentId: keepAppointmentId, resolvedAt },
    kept: { ...kept, status: "confirmado" },
    released: active
      .filter((appointment) => appointment.id !== keepAppointmentId)
      .map((appointment) => ({ ...appointment, status: "liberado" })),
  };
}

export type DuplicateOverviewInput = {
  groups: readonly DuplicateGroup[];
  checks: readonly DuplicateCheck[];
  appointments: readonly Appointment[];
};

/** Junta os grupos detectados com as confirmações já enviadas. Função pura. */
export function buildDuplicateOverview({
  groups,
  checks,
  appointments,
}: DuplicateOverviewInput): DuplicateBookingOverview {
  const activeIds = activeAppointmentIdsOf(appointments);
  const reusableIds = new Set(
    appointments
      .filter((appointment) => isSlotReusable(appointment.status))
      .map((appointment) => appointment.id),
  );

  const alerts: DuplicateAlert[] = groups.map((group) => {
    const check = openCheckSharing(group, checks, activeIds);
    return {
      ...group,
      check: check
        ? { id: check.id, sentAt: check.sentAt, appointmentIds: [...check.appointmentIds] }
        : null,
    };
  });

  return {
    alerts,
    flaggedAppointmentIds: groups.flatMap((group) =>
      group.appointments.map((appointment) => appointment.id),
    ),
    releasedAppointmentIds: checks.flatMap((check) =>
      check.status === "resolvida"
        ? check.appointmentIds.filter(
            (id) => id !== check.keptAppointmentId && reusableIds.has(id),
          )
        : [],
    ),
  };
}
