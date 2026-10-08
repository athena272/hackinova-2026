import { CLINIC_TIME_ZONE } from "../clinic";

export type ClinicDateTime = {
  /** 0 = domingo ... 6 = sábado. */
  weekday: number;
  hour: number;
  minute: number;
};

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CLINIC_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function partsOf(iso: string, using: Intl.DateTimeFormat): Record<string, string> {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Data inválida: ${iso}`);
  }
  return Object.fromEntries(using.formatToParts(date).map((part) => [part.type, part.value]));
}

/** Dia da semana e hora no fuso da clínica, independente do fuso do servidor. */
export function getClinicDateTime(iso: string): ClinicDateTime {
  const parts = partsOf(iso, formatter);
  return {
    weekday: WEEKDAY_INDEX[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/** Data do calendário (YYYY-MM-DD) no fuso da clínica: 23h de Aracaju ainda é o mesmo dia. */
export function getClinicDate(iso: string): string {
  const { year, month, day } = partsOf(iso, dateFormatter);
  return `${year}-${month}-${day}`;
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "dia desconhecido";
}

export function formatClinicTime({ hour, minute }: ClinicDateTime): string {
  return `${hour}h${String(minute).padStart(2, "0")}`;
}
