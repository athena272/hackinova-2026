import type { ProcedureType } from "../appointment";

/** Por que a vaga recuperada estava livre. */
export type RecoveryOrigin = "leilao" | "preparo" | "booking_duplo" | "overbooking";

/** Uma vaga que voltou a ter paciente: aceite na cascata ou encaixe aceito. */
export type RecoveredSlot = {
  origin: RecoveryOrigin;
  appointmentId: string;
  /** Horário da consulta ou do exame; define em que período a recuperação entra. */
  scheduledAt: string;
  procedureType: ProcedureType;
  /** Paciente da lista de espera que ficou com a vaga. */
  patientId: string;
};

export type MetricsPeriodKind = "semana" | "mes";

/** Intervalo fechado de datas do calendário da clínica, em YYYY-MM-DD. */
export type MetricsPeriod = {
  kind: MetricsPeriodKind;
  start: string;
  end: string;
};

export type AveragePrices = Readonly<Record<ProcedureType, number>>;

export type NoShowSummary = {
  noShows: number;
  attended: number;
  /** faltas / (faltas + comparecimentos); null quando ninguém tinha consulta encerrada. */
  rate: number | null;
};

export type RecoveryMetrics = {
  period: MetricsPeriod;
  recovered: {
    total: number;
    byOrigin: Record<RecoveryOrigin, number>;
  };
  waitlistPatientsServed: number;
  noShow: NoShowSummary;
  /** Em reais, pelo preço médio do tipo de procedimento. */
  estimatedValue: number;
  prices: AveragePrices;
  /** false quando o período não tem recuperação nem consulta encerrada. */
  hasData: boolean;
};
