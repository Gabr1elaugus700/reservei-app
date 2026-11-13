import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Cliente único dos agendamentos feitos no balcão.
 * O id é fixo de propósito: get-or-create e o seed usam a mesma chave,
 * e Booking.customerId continua obrigatório.
 */
export const COUNTER_CUSTOMER_ID = "cliente-balcao";
export const COUNTER_CUSTOMER_NAME = "Cliente balcão";

const MAX_COUNTER_NOTE_LENGTH = 120;

export type CounterCustomerRecord = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type CounterCustomerStore = {
  findById(id: string): Promise<CounterCustomerRecord | null>;
  create(data: CounterCustomerRecord): Promise<CounterCustomerRecord>;
};

export class CounterCustomerConflict extends Error {
  constructor() {
    super("Counter customer already exists");
    this.name = "CounterCustomerConflict";
  }
}

export function isCounterCustomerId(id: string | null | undefined): boolean {
  return id === COUNTER_CUSTOMER_ID;
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }
  return error.code === "P2002";
}

/**
 * O cliente balcão não tem telefone e não entra na normalização,
 * mesmo que uma linha antiga tenha um número gravado por engano.
 */
export function shouldNormalizeCustomerPhone(customer: {
  id: string;
  phone: string | null;
}): boolean {
  if (isCounterCustomerId(customer.id)) return false;
  return typeof customer.phone === "string" && customer.phone.length > 0;
}

export function omitCounterCustomer<T extends { id: string }>(customers: T[]): T[] {
  return customers.filter((customer) => !isCounterCustomerId(customer.id));
}

export function normalizeCounterNotes(
  value: unknown
): { ok: true; notes: string | null } | { ok: false; message: string } {
  if (value == null) return { ok: true, notes: null };
  if (typeof value !== "string") {
    return { ok: false, message: "Apelido inválido" };
  }

  const notes = value.trim();
  if (!notes) return { ok: true, notes: null };
  if (notes.length > MAX_COUNTER_NOTE_LENGTH) {
    return {
      ok: false,
      message: "O apelido pode ter no máximo 120 caracteres",
    };
  }

  return { ok: true, notes };
}

type BookingAuthorization =
  | { ok: true; useCounterCustomer: true }
  | { ok: true; useCounterCustomer: false; customerId: string }
  | { ok: false; status: 401 | 403 | 400; message: string };

/**
 * Balcão só com sessão. Sem a flag, o id fixo é recusado — a página pública
 * continua exigindo nome e WhatsApp e não consegue usar este cliente.
 */
export function authorizeBookingCreate(input: {
  counter: boolean;
  hasSession: boolean;
  customerId: unknown;
}): BookingAuthorization {
  if (input.counter) {
    if (!input.hasSession) {
      return {
        ok: false,
        status: 401,
        message: "É preciso estar autenticado para criar um agendamento de balcão",
      };
    }
    return { ok: true, useCounterCustomer: true };
  }

  if (typeof input.customerId === "string" && isCounterCustomerId(input.customerId)) {
    return {
      ok: false,
      status: 403,
      message: "O cliente balcão só pode ser usado no agendamento de balcão",
    };
  }

  if (typeof input.customerId !== "string" || input.customerId.length === 0) {
    return {
      ok: false,
      status: 400,
      message: "Missing required fields: timeSlotId, customerId, date, time",
    };
  }

  return {
    ok: true,
    useCounterCustomer: false,
    customerId: input.customerId,
  };
}

export type ResolvedBookingCustomer =
  | { ok: true; counter: true; customerId: string }
  | { ok: true; counter: false; customerId: string }
  | { ok: false; status: 401 | 403 | 400; message: string };

/**
 * Resolve o customerId do agendamento. Sem sessão, o balcão falha antes
 * de qualquer insert. Com sessão, cria ou reaproveita o cliente único.
 */
export async function resolveBookingCustomer(
  input: {
    counter: boolean;
    hasSession: boolean;
    customerId: unknown;
  },
  store: CounterCustomerStore
): Promise<ResolvedBookingCustomer> {
  const decision = authorizeBookingCreate(input);
  if (!decision.ok) return decision;

  if (!decision.useCounterCustomer) {
    return { ok: true, counter: false, customerId: decision.customerId };
  }

  const customer = await getOrCreateCounterCustomer(store);
  return { ok: true, counter: true, customerId: customer.id };
}

/**
 * Get-or-create pelo id fixo. Se duas requisições passarem do find ao mesmo
 * tempo, o insert perdedor cai na chave primária e a leitura seguinte devolve
 * a linha que venceu. Não altera uma linha que já exista.
 */
export async function getOrCreateCounterCustomer(
  store: CounterCustomerStore
): Promise<CounterCustomerRecord> {
  const existing = await store.findById(COUNTER_CUSTOMER_ID);
  if (existing) return existing;

  try {
    return await store.create({
      id: COUNTER_CUSTOMER_ID,
      name: COUNTER_CUSTOMER_NAME,
      phone: null,
      email: null,
    });
  } catch (error) {
    if (!(error instanceof CounterCustomerConflict)) throw error;

    const created = await store.findById(COUNTER_CUSTOMER_ID);
    if (!created) throw error;
    return created;
  }
}

type CustomerDb = PrismaClient | Prisma.TransactionClient;

export function counterCustomerStore(db: CustomerDb): CounterCustomerStore {
  const select = {
    id: true,
    name: true,
    phone: true,
    email: true,
  } as const;

  return {
    async findById(id) {
      return db.customer.findUnique({ where: { id }, select });
    },
    async create(data) {
      try {
        return await db.customer.create({
          data: {
            id: data.id,
            name: data.name,
            phone: null,
            email: null,
          },
          select,
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new CounterCustomerConflict();
        }
        throw error;
      }
    },
  };
}
