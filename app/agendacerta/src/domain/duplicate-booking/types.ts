import type { Appointment, Procedure } from "../appointment";

export type DuplicateCheckStatus = "aguardando" | "resolvida";

/** Horários ativos do mesmo paciente para o mesmo serviço, em datas próximas. */
export type DuplicateGroup = {
  /** Ids dos horários em ordem alfabética (groupKeyOf). */
  key: string;
  patientId: string;
  patientName: string;
  specialty: string;
  procedure: Procedure;
  /** Em ordem de horário. */
  appointments: Appointment[];
};

type DuplicateCheckBase = {
  id: string;
  patientId: string;
  groupKey: string;
  /** Horários perguntados ao paciente, em ordem de horário. */
  appointmentIds: string[];
  sentAt: string;
};

/** Confirmação reforçada enviada, esperando o paciente escolher. */
export type OpenDuplicateCheck = DuplicateCheckBase & {
  status: "aguardando";
  keptAppointmentId: null;
  resolvedAt: null;
};

/** O paciente escolheu qual horário manter. */
export type ResolvedDuplicateCheck = DuplicateCheckBase & {
  status: "resolvida";
  keptAppointmentId: string;
  resolvedAt: string;
};

export type DuplicateCheck = OpenDuplicateCheck | ResolvedDuplicateCheck;

/** Resultado da escolha: a confirmação resolvida e os agendamentos já transformados. */
export type DuplicateCheckResolution = {
  check: ResolvedDuplicateCheck;
  kept: Appointment;
  released: Appointment[];
};

/** Possível duplicidade mostrada no painel e no mock. */
export type DuplicateAlert = DuplicateGroup & {
  /** null enquanto a clínica não enviou a confirmação reforçada. */
  check: { id: string; sentAt: string; appointmentIds: string[] } | null;
};

export type DuplicateBookingOverview = {
  alerts: DuplicateAlert[];
  /** Agendamentos que fazem parte de alguma possível duplicidade. */
  flaggedAppointmentIds: string[];
  /** Horários descartados pelo paciente que continuam liberados. */
  releasedAppointmentIds: string[];
};
