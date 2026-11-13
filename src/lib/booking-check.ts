export type PublicBookingSummary = {
  id: string;
  date: string;
  time: string;
  adults: number;
  children: number;
  totalPrice: number;
};

export type CheckableBooking = PublicBookingSummary & {
  timeSlotId: string;
  createdAt?: string;
};

export type CapacityPlan =
  | { type: "same-slot"; slotId: string; delta: number }
  | {
      type: "move";
      fromSlotId: string;
      toSlotId: string;
      release: number;
      take: number;
    };

export function toPublicBookingSummary(
  booking: CheckableBooking
): PublicBookingSummary {
  return {
    id: booking.id,
    date: booking.date,
    time: booking.time,
    adults: booking.adults,
    children: booking.children,
    totalPrice: booking.totalPrice,
  };
}

function byNearest(left: CheckableBooking, right: CheckableBooking): number {
  if (left.date !== right.date) return left.date < right.date ? -1 : 1;
  if (left.time !== right.time) return left.time < right.time ? -1 : 1;

  const leftCreated = left.createdAt ?? "";
  const rightCreated = right.createdAt ?? "";
  if (leftCreated !== rightCreated) return leftCreated < rightCreated ? -1 : 1;
  return 0;
}

/**
 * Entre os agendamentos ativos futuros, o mesmo horário tem prioridade.
 * Sem ele, vale o mais próximo (data, hora e, no empate, o mais antigo).
 * O retorno não leva nome nem telefone.
 */
export function selectActiveBooking(
  bookings: CheckableBooking[],
  target: { date: string; time: string; timeSlotId: string }
): { sameSlot: boolean; booking: PublicBookingSummary | null } {
  const ordered = [...bookings].sort(byNearest);
  const sameSlotBooking = ordered.find(
    (booking) =>
      booking.timeSlotId === target.timeSlotId ||
      (booking.date === target.date && booking.time === target.time)
  );

  if (sameSlotBooking) {
    return { sameSlot: true, booking: toPublicBookingSummary(sameSlotBooking) };
  }

  const nearest = ordered[0];
  if (!nearest) return { sameSlot: false, booking: null };

  return { sameSlot: false, booking: toPublicBookingSummary(nearest) };
}

/**
 * Adultos ocupam vaga; crianças não.
 * No mesmo slot o ajuste é o delta. Ao mover, devolve a vaga antiga inteira
 * e ocupa a nova inteira — não só a diferença.
 */
export function planCapacityAdjustment(input: {
  currentSlotId: string;
  nextSlotId: string;
  currentAdults: number;
  nextAdults: number;
}): CapacityPlan {
  if (input.currentSlotId === input.nextSlotId) {
    return {
      type: "same-slot",
      slotId: input.currentSlotId,
      delta: input.nextAdults - input.currentAdults,
    };
  }

  return {
    type: "move",
    fromSlotId: input.currentSlotId,
    toSlotId: input.nextSlotId,
    release: input.currentAdults,
    take: input.nextAdults,
  };
}
