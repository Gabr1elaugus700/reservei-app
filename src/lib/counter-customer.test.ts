import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COUNTER_CUSTOMER_ID,
  COUNTER_CUSTOMER_NAME,
  CounterCustomerConflict,
  type CounterCustomerRecord,
  type CounterCustomerStore,
  authorizeBookingCreate,
  getOrCreateCounterCustomer,
  isUniqueConstraintViolation,
  normalizeCounterNotes,
  omitCounterCustomer,
  resolveBookingCustomer,
  shouldNormalizeCustomerPhone,
} from "./counter-customer";

function memoryStore(): { store: CounterCustomerStore; rows: Map<string, CounterCustomerRecord>; creates: () => number } {
  const rows = new Map<string, CounterCustomerRecord>();
  let creates = 0;

  return {
    rows,
    creates: () => creates,
    store: {
      async findById(id) {
        const row = rows.get(id);
        return row ? { ...row } : null;
      },
      async create(data) {
        creates += 1;
        if (rows.has(data.id)) throw new CounterCustomerConflict();
        const row = { ...data, phone: null, email: null };
        rows.set(data.id, row);
        return { ...row };
      },
    },
  };
}

describe("getOrCreateCounterCustomer", () => {
  it("cria o cliente balcão uma vez, sem telefone, e reaproveita na segunda chamada", async () => {
    const db = memoryStore();

    const created = await getOrCreateCounterCustomer(db.store);
    const again = await getOrCreateCounterCustomer(db.store);

    assert.equal(db.creates(), 1);
    assert.equal(db.rows.size, 1);
    assert.equal(created.id, COUNTER_CUSTOMER_ID);
    assert.equal(created.name, COUNTER_CUSTOMER_NAME);
    assert.equal(created.phone, null);
    assert.equal(again.id, created.id);
    assert.equal(again.phone, null);
  });

  it("devolve o mesmo cliente quando duas chamadas disputam o insert", async () => {
    const rows = new Map<string, CounterCustomerRecord>();
    let lookups = 0;
    let releaseLookups: () => void = () => {};
    const bothLooking = new Promise<void>((resolve) => {
      releaseLookups = resolve;
    });

    const store: CounterCustomerStore = {
      async findById(id) {
        lookups += 1;
        if (lookups <= 2) {
          if (lookups === 2) releaseLookups();
          await bothLooking;
          return null;
        }
        const row = rows.get(id);
        return row ? { ...row } : null;
      },
      async create(data) {
        if (rows.has(data.id)) throw new CounterCustomerConflict();
        const row = { ...data };
        rows.set(data.id, row);
        return { ...row };
      },
    };

    const [first, second] = await Promise.all([
      getOrCreateCounterCustomer(store),
      getOrCreateCounterCustomer(store),
    ]);

    assert.equal(rows.size, 1);
    assert.equal(first.id, COUNTER_CUSTOMER_ID);
    assert.equal(second.id, first.id);
    assert.equal(first.phone, null);
    assert.equal(first.name, COUNTER_CUSTOMER_NAME);
  });
});

describe("resolveBookingCustomer", () => {
  it("exige sessão e não cria o cliente balcão sem ela", async () => {
    const db = memoryStore();

    const result = await resolveBookingCustomer(
      { counter: true, hasSession: false, customerId: undefined },
      db.store
    );

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
    assert.equal(db.creates(), 0);
    assert.equal(db.rows.size, 0);
  });

  it("com sessão, cria o cliente uma vez e ignora um customerId enviado pelo cliente", async () => {
    const db = memoryStore();
    const input = {
      counter: true,
      hasSession: true,
      customerId: "outro-cliente",
    };

    const first = await resolveBookingCustomer(input, db.store);
    const second = await resolveBookingCustomer(input, db.store);

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(first.counter, true);
      assert.equal(first.customerId, COUNTER_CUSTOMER_ID);
      assert.equal(second.customerId, first.customerId);
    }
    assert.equal(db.creates(), 1);
  });

  it("recusa o id do cliente balcão fora do agendamento de balcão", async () => {
    const db = memoryStore();

    const anonymous = await resolveBookingCustomer(
      { counter: false, hasSession: false, customerId: COUNTER_CUSTOMER_ID },
      db.store
    );
    const signedIn = await resolveBookingCustomer(
      { counter: false, hasSession: true, customerId: COUNTER_CUSTOMER_ID },
      db.store
    );

    assert.equal(anonymous.ok, false);
    assert.equal(signedIn.ok, false);
    if (!anonymous.ok) assert.equal(anonymous.status, 403);
    if (!signedIn.ok) assert.equal(signedIn.status, 403);
    assert.equal(db.creates(), 0);
  });

  it("mantém o agendamento público com cliente comum, sem sessão", async () => {
    const db = memoryStore();

    const result = await resolveBookingCustomer(
      { counter: false, hasSession: false, customerId: "cust_123" },
      db.store
    );

    assert.deepEqual(result, {
      ok: true,
      counter: false,
      customerId: "cust_123",
    });
    assert.equal(db.creates(), 0);
  });
});

describe("authorizeBookingCreate", () => {
  it("não aceita a flag de balcão sem sessão", () => {
    const result = authorizeBookingCreate({
      counter: true,
      hasSession: false,
      customerId: "cust_123",
    });

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.status, 401);
  });
});

describe("cliente balcão fora da busca e da normalização", () => {
  it("não entra na busca por WhatsApp", () => {
    const visible = omitCounterCustomer([
      { id: COUNTER_CUSTOMER_ID, phone: "11999999999" },
      { id: "real", phone: "11999999999" },
    ]);

    assert.deepEqual(
      visible.map((customer) => customer.id),
      ["real"]
    );
  });

  it("não entra na normalização de telefone", () => {
    assert.equal(
      shouldNormalizeCustomerPhone({
        id: COUNTER_CUSTOMER_ID,
        phone: "11999999999",
      }),
      false
    );
    assert.equal(
      shouldNormalizeCustomerPhone({ id: COUNTER_CUSTOMER_ID, phone: null }),
      false
    );
    assert.equal(
      shouldNormalizeCustomerPhone({ id: "real", phone: null }),
      false
    );
    assert.equal(
      shouldNormalizeCustomerPhone({ id: "real", phone: "(11) 99999-9999" }),
      true
    );
  });

  it("reconhece a violação de chave única do Prisma", () => {
    assert.equal(isUniqueConstraintViolation({ code: "P2002" }), true);
    assert.equal(isUniqueConstraintViolation(new Error("falhou")), false);
    assert.equal(isUniqueConstraintViolation({ code: "P2003" }), false);
  });
});

describe("normalizeCounterNotes", () => {
  it("guarda o apelido e trata vazio como ausência", () => {
    assert.deepEqual(normalizeCounterNotes("  família Silva  "), {
      ok: true,
      notes: "família Silva",
    });
    assert.deepEqual(normalizeCounterNotes("   "), { ok: true, notes: null });
    assert.deepEqual(normalizeCounterNotes(null), { ok: true, notes: null });
  });

  it("recusa apelido longo demais", () => {
    const result = normalizeCounterNotes("a".repeat(121));
    assert.equal(result.ok, false);
  });
});
