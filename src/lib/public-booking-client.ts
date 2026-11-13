import type { PublicBookingSummary } from "@/lib/booking-check";
import { normalizePhone } from "@/lib/phone";

export class BookingRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BookingRequestError";
    this.status = status;
  }
}

export type BookingDraft = {
  customerId: string;
  timeSlotId: string;
  isoDate: string;
  time: string;
  adults: number;
  children: number;
  totalPrice: number;
  responsibleName: string;
  whatsapp: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json();
  return isRecord(body) ? body : {};
}

function messageFrom(body: Record<string, unknown>, fallback: string): string {
  return typeof body.message === "string" && body.message.trim()
    ? body.message
    : fallback;
}

function failureMessage(status: number, body: Record<string, unknown>, fallback: string): string {
  const message = messageFrom(body, fallback);
  if (status === 409 && /capacity/i.test(message)) {
    return "Não há vagas suficientes neste horário.";
  }
  return message;
}

function parseSummary(value: unknown): PublicBookingSummary | null {
  if (value == null) return null;
  if (!isRecord(value)) {
    throw new BookingRequestError("Resposta inválida ao verificar agendamentos", 500);
  }

  if (
    "name" in value ||
    "phone" in value ||
    "customer" in value ||
    typeof value.id !== "string" ||
    typeof value.date !== "string" ||
    typeof value.time !== "string" ||
    typeof value.adults !== "number" ||
    typeof value.children !== "number" ||
    typeof value.totalPrice !== "number"
  ) {
    throw new BookingRequestError("Resposta inválida ao verificar agendamentos", 500);
  }

  return {
    id: value.id,
    date: value.date,
    time: value.time,
    adults: value.adults,
    children: value.children,
    totalPrice: value.totalPrice,
  };
}

export async function ensureCustomer(input: {
  customerId: string;
  name: string;
  phone: string;
}): Promise<string> {
  if (input.customerId) return input.customerId;

  const phone = normalizePhone(input.phone);
  if (!phone) {
    throw new BookingRequestError("Número de WhatsApp inválido", 400);
  }

  const response = await fetch("/api/customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: input.name, phone }),
  });
  const body = await readJson(response);

  if (response.status === 409) {
    const lookup = await fetch(`/api/customer?phone=${encodeURIComponent(phone)}`);
    const found = await readJson(lookup);
    if (!lookup.ok || found.success !== true || !isRecord(found.data) || typeof found.data.id !== "string") {
      throw new BookingRequestError(failureMessage(response.status, body, "Cliente já cadastrado"), response.status);
    }
    return found.data.id;
  }

  if (!response.ok || body.success !== true || !isRecord(body.data) || typeof body.data.id !== "string") {
    throw new BookingRequestError(failureMessage(response.status, body, "Erro ao criar cliente"), response.status);
  }

  return body.data.id;
}

export async function checkDuplicateBooking(input: {
  phone: string;
  isoDate: string;
  timeSlotId: string;
}): Promise<{ sameSlot: boolean; booking: PublicBookingSummary | null }> {
  const phone = normalizePhone(input.phone);
  if (!phone) {
    throw new BookingRequestError("Número de WhatsApp inválido", 400);
  }

  const params = new URLSearchParams({
    phone,
    date: input.isoDate,
    timeSlotId: input.timeSlotId,
  });
  const response = await fetch(`/api/bookings/check?${params.toString()}`);
  const body = await readJson(response);

  if (!response.ok || body.success !== true) {
    throw new BookingRequestError(
      failureMessage(response.status, body, "Erro ao verificar agendamentos"),
      response.status
    );
  }

  return {
    sameSlot: body.sameSlot === true,
    booking: parseSummary(body.booking),
  };
}

export async function createBooking(draft: BookingDraft): Promise<void> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timeSlotId: draft.timeSlotId,
      customerId: draft.customerId,
      date: draft.isoDate,
      time: draft.time,
      adults: draft.adults,
      children: draft.children,
      totalPrice: draft.totalPrice,
    }),
  });
  const body = await readJson(response);

  if (!response.ok || body.success !== true) {
    throw new BookingRequestError(
      failureMessage(response.status, body, "Erro ao criar agendamento"),
      response.status
    );
  }
}

export async function updatePublicBooking(
  bookingId: string,
  draft: BookingDraft
): Promise<PublicBookingSummary> {
  const phone = normalizePhone(draft.whatsapp);
  if (!phone) {
    throw new BookingRequestError("Número de WhatsApp inválido", 400);
  }

  const response = await fetch(`/api/bookings/public/${bookingId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone,
      timeSlotId: draft.timeSlotId,
      date: draft.isoDate,
      time: draft.time,
      adults: draft.adults,
      children: draft.children,
    }),
  });
  const body = await readJson(response);

  if (!response.ok || body.success !== true) {
    throw new BookingRequestError(
      failureMessage(response.status, body, "Erro ao atualizar agendamento"),
      response.status
    );
  }

  const updated = parseSummary(body.data);
  if (!updated) {
    throw new BookingRequestError("Erro ao atualizar agendamento", 500);
  }
  return updated;
}
