import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTotalPrice,
  formatLongDate,
  formatShortSchedule,
  formatVisitors,
} from "./booking-display";

describe("formatVisitors", () => {
  it("usa o singular e omite crianças quando não há", () => {
    assert.equal(formatVisitors(1, 0), "1 adulto");
    assert.equal(formatVisitors(2, 0), "2 adultos");
  });

  it("junta adultos e crianças", () => {
    assert.equal(formatVisitors(2, 1), "2 adultos, 1 criança");
    assert.equal(formatVisitors(3, 2), "3 adultos, 2 crianças");
  });
});

describe("calculateTotalPrice", () => {
  it("cobra 10 por adulto e 5 por criança", () => {
    assert.equal(calculateTotalPrice(2, 1), 25);
    assert.equal(calculateTotalPrice(3, 1), 35);
  });
});

describe("formatLongDate", () => {
  it("usa o dia da semana real da data", () => {
    assert.equal(formatLongDate("2026-11-14"), "Sábado, 14/11/2026");
    assert.equal(formatLongDate("2026-11-15"), "Domingo, 15/11/2026");
  });
});

describe("formatShortSchedule", () => {
  it("mostra dia, mês e hora para o botão de mover", () => {
    assert.equal(formatShortSchedule("2026-11-22", "10:00"), "22/11 às 10:00");
  });
});
