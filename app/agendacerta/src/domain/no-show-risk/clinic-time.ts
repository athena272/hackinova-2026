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

/** Dia da semana e hora no fuso da clínica, independente do fuso do servidor. */
export function getClinicDateTime(iso: string): ClinicDateTime {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Data inválida: ${iso}`);
  }

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    weekday: WEEKDAY_INDEX[parts.weekday],
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "dia desconhecido";
}

export function formatClinicTime({ hour, minute }: ClinicDateTime): string {
  return `${hour}h${String(minute).padStart(2, "0")}`;
}
