const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

/** Dia civil em America/Sao_Paulo, no formato YYYY-MM-DD. */
export function todayIsoInTimeZone(
  timeZone: string = BUSINESS_TIME_ZONE,
  now: Date = new Date()
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Data gravada em coluna DATE. O Prisma devolve meia-noite em UTC,
 * então os componentes UTC são o dia civil, independente do fuso do servidor.
 */
export function formatStoredDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isTimeValue(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function toUtcDateOnly(isoDate: string): Date {
  if (!isIsoDate(isoDate)) {
    throw new Error("Data inválida");
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
