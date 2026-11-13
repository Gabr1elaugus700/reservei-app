import { formatDate } from "@/lib/format-date";

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

function weekdayName(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";
  return WEEKDAY_NAMES[date.getDay()] ?? "";
}

export const ADULT_TICKET_PRICE = 10;
export const CHILD_TICKET_PRICE = 5;

export function calculateTotalPrice(adults: number, children: number): number {
  return adults * ADULT_TICKET_PRICE + children * CHILD_TICKET_PRICE;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatVisitors(adults: number, children: number): string {
  const adultsLabel = adults === 1 ? "1 adulto" : `${adults} adultos`;
  if (children <= 0) return adultsLabel;

  const childrenLabel = children === 1 ? "1 criança" : `${children} crianças`;
  return `${adultsLabel}, ${childrenLabel}`;
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatLongDate(isoDate: string): string {
  return `${weekdayName(isoDate)}, ${formatDate(isoDate)}`;
}

export function formatSchedule(isoDate: string, time: string): string {
  return `${formatLongDate(isoDate)} às ${time}`;
}

export function formatShortSchedule(isoDate: string, time: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month} às ${time}`;
}

/** Nome exibido na lista do dia. O apelido opcional vem de Booking.notes. */
export function formatCounterBookingLabel(notes: string | null | undefined): string {
  const nickname = notes?.trim() ?? "";
  if (!nickname) return "Balcão";
  return `Balcão · ${nickname}`;
}
