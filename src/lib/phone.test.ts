import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("remove máscara e devolve 11 dígitos", () => {
    assert.equal(normalizePhone("(11) 98765-4321"), "11987654321");
  });

  it("remove o código do país +55", () => {
    assert.equal(normalizePhone("+55 11 98765-4321"), "11987654321");
    assert.equal(normalizePhone("+55 (11) 98765-4321"), "11987654321");
  });

  it("remove o 55 quando o número já vem só com dígitos", () => {
    assert.equal(normalizePhone("5511987654321"), "11987654321");
  });

  it("aceita fixo com 10 dígitos, com e sem 55", () => {
    assert.equal(normalizePhone("1133334444"), "1133334444");
    assert.equal(normalizePhone("(11) 3333-4444"), "1133334444");
    assert.equal(normalizePhone("551133334444"), "1133334444");
    assert.equal(normalizePhone("+55 11 3333-4444"), "1133334444");
  });

  it("trata o mesmo número em formatos diferentes como igual", () => {
    const formats = [
      "(11) 98765-4321",
      "11987654321",
      "5511987654321",
      "+55 11 98765-4321",
      "55 11 9 8765-4321",
    ];

    const normalized = formats.map((value) => normalizePhone(value));
    assert.deepEqual(normalized, Array(formats.length).fill("11987654321"));
  });

  it("não remove o DDD 55 de um número que já está no formato nacional", () => {
    assert.equal(normalizePhone("55987654321"), "55987654321");
    assert.equal(normalizePhone("(55) 98765-4321"), "55987654321");
  });

  it("remove só o país quando o DDD também é 55", () => {
    assert.equal(normalizePhone("5555987654321"), "55987654321");
    assert.equal(normalizePhone("+55 55 98765-4321"), "55987654321");
  });

  it("rejeita vazio, curto, longo e sem dígitos", () => {
    assert.equal(normalizePhone(""), null);
    assert.equal(normalizePhone("   "), null);
    assert.equal(normalizePhone(null), null);
    assert.equal(normalizePhone(undefined), null);
    assert.equal(normalizePhone("abc"), null);
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("119876543"), null);
    assert.equal(normalizePhone("119876543210"), null);
    assert.equal(normalizePhone("55119876543210"), null);
    assert.equal(normalizePhone("011987654321"), null);
  });
});

describe("formatPhone", () => {
  it("formata celular e fixo para exibição", () => {
    assert.equal(formatPhone("11987654321"), "(11) 98765-4321");
    assert.equal(formatPhone("1133334444"), "(11) 3333-4444");
    assert.equal(formatPhone("+55 11 98765-4321"), "(11) 98765-4321");
  });

  it("devolve string vazia quando o telefone é inválido", () => {
    assert.equal(formatPhone("123"), "");
    assert.equal(formatPhone(null), "");
  });
});
