import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  planCapacityAdjustment,
  selectActiveBooking,
  toPublicBookingSummary,
  type CheckableBooking,
} from "./booking-check";
import {
  formatStoredDate,
  isIsoDate,
  isTimeValue,
  todayIsoInTimeZone,
} from "./booking-dates";

function booking(overrides: Partial<CheckableBooking> = {}): CheckableBooking {
  return {
    id: "booking-1",
    date: "2026-11-20",
    time: "14:00",
    adults: 2,
    children: 1,
    totalPrice: 25,
    timeSlotId: "slot-late",
    createdAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

describe("selectActiveBooking", () => {
  it("não alerta quando não há agendamento ativo", () => {
    assert.deepEqual(
      selectActiveBooking([], {
        date: "2026-11-20",
        time: "14:00",
        timeSlotId: "slot-late",
      }),
      { sameSlot: false, booking: null }
    );
  });

  it("prefere o mesmo horário mesmo que exista outro mais próximo", () => {
    const nearer = booking({
      id: "near",
      date: "2026-11-16",
      time: "09:00",
      timeSlotId: "slot-near",
    });
    const same = booking({
      id: "same",
      date: "2026-11-22",
      time: "10:00",
      timeSlotId: "slot-target",
      adults: 2,
      children: 0,
      totalPrice: 20,
    });

    const result = selectActiveBooking([nearer, same], {
      date: "2026-11-22",
      time: "10:00",
      timeSlotId: "slot-target",
    });

    assert.equal(result.sameSlot, true);
    assert.equal(result.booking?.id, "same");
  });

  it("trata mesma data e hora como o mesmo horário", () => {
    const result = selectActiveBooking(
      [booking({ timeSlotId: "outro-id", date: "2026-11-22", time: "10:00" })],
      { date: "2026-11-22", time: "10:00", timeSlotId: "slot-target" }
    );

    assert.equal(result.sameSlot, true);
    assert.equal(result.booking?.id, "booking-1");
  });

  it("sem o mesmo horário, escolhe o ativo mais próximo", () => {
    const later = booking({ id: "later", date: "2026-12-01", time: "09:00" });
    const sooner = booking({
      id: "sooner",
      date: "2026-11-16",
      time: "16:00",
      timeSlotId: "slot-soon",
    });

    const result = selectActiveBooking([later, sooner], {
      date: "2026-11-28",
      time: "11:00",
      timeSlotId: "slot-new",
    });

    assert.equal(result.sameSlot, false);
    assert.equal(result.booking?.id, "sooner");
  });

  it("no empate de data e hora, fica com o cadastro mais antigo", () => {
    const newer = booking({
      id: "newer",
      createdAt: "2026-11-02T12:00:00.000Z",
    });
    const older = booking({
      id: "older",
      createdAt: "2026-11-01T12:00:00.000Z",
    });

    const result = selectActiveBooking([newer, older], {
      date: "2026-11-28",
      time: "11:00",
      timeSlotId: "slot-new",
    });

    assert.equal(result.booking?.id, "older");
  });

  it("não inclui nome nem telefone no resumo público", () => {
    const summary = toPublicBookingSummary(booking());
    assert.deepEqual(Object.keys(summary).sort(), [
      "adults",
      "children",
      "date",
      "id",
      "time",
      "totalPrice",
    ]);
  });
});

describe("planCapacityAdjustment", () => {
  it("no mesmo slot ajusta só o delta de adultos", () => {
    assert.deepEqual(
      planCapacityAdjustment({
        currentSlotId: "slot-a",
        nextSlotId: "slot-a",
        currentAdults: 2,
        nextAdults: 4,
      }),
      { type: "same-slot", slotId: "slot-a", delta: 2 }
    );

    assert.deepEqual(
      planCapacityAdjustment({
        currentSlotId: "slot-a",
        nextSlotId: "slot-a",
        currentAdults: 4,
        nextAdults: 1,
      }),
      { type: "same-slot", slotId: "slot-a", delta: -3 }
    );
  });

  it("ao mover, devolve a vaga antiga e ocupa a nova por completo", () => {
    assert.deepEqual(
      planCapacityAdjustment({
        currentSlotId: "slot-a",
        nextSlotId: "slot-b",
        currentAdults: 2,
        nextAdults: 5,
      }),
      {
        type: "move",
        fromSlotId: "slot-a",
        toSlotId: "slot-b",
        release: 2,
        take: 5,
      }
    );
  });
});

describe("datas do agendamento", () => {
  it("lê a coluna DATE pelo dia UTC", () => {
    assert.equal(
      formatStoredDate(new Date("2026-11-15T00:00:00.000Z")),
      "2026-11-15"
    );
  });

  it("considera o dia civil de São Paulo", () => {
    assert.equal(
      todayIsoInTimeZone(
        "America/Sao_Paulo",
        new Date("2026-11-15T02:30:00.000Z")
      ),
      "2026-11-14"
    );
    assert.equal(
      todayIsoInTimeZone(
        "America/Sao_Paulo",
        new Date("2026-11-15T15:00:00.000Z")
      ),
      "2026-11-15"
    );
  });

  it("rejeita data e hora inválidas", () => {
    assert.equal(isIsoDate("2026-11-15"), true);
    assert.equal(isIsoDate("2026-02-31"), false);
    assert.equal(isIsoDate("15/11/2026"), false);
    assert.equal(isTimeValue("09:30"), true);
    assert.equal(isTimeValue("9:30"), false);
    assert.equal(isTimeValue("24:00"), false);
  });
});
