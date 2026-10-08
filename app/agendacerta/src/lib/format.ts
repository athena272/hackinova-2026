const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" });

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** Milissegundos até o prazo; nunca negativo. */
export function remainingMs(untilIso: string, nowMs: number): number {
  return Math.max(0, Date.parse(untilIso) - nowMs);
}

/** Tempo restante como mm:ss (passa de 60 minutos sem virar hora). */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Distância curta para o histórico: "3,7 km" ou "distância desconhecida". */
export function formatDistance(km: number | null): string {
  if (km === null) return "distância desconhecida";
  return `${km.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
}

const wholeCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** "R$ 750" ou "R$ 1.250,50": centavos só quando existem. */
export function formatCurrency(value: number): string {
  return (Number.isInteger(value) ? wholeCurrencyFormatter : currencyFormatter).format(value);
}

/** Fração de 0 a 1 como "50%" ou "33,3%". */
export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction);
}

/** Até duas iniciais do nome, para o avatar do mock de WhatsApp. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
