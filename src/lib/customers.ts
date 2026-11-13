import type { Customer, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COUNTER_CUSTOMER_ID, isCounterCustomerId, omitCounterCustomer } from "@/lib/counter-customer";
import { normalizePhone } from "@/lib/phone";

type PhoneWriter = PrismaClient | Prisma.TransactionClient;

/**
 * Acha todos os clientes daquele WhatsApp, do mais antigo para o mais novo.
 *
 * Compara pelo telefone já normalizado e, em seguida, por linhas antigas que
 * ainda estão com máscara ou com 55. Assim a busca funciona antes e depois
 * da migration. Não funde cadastros: se houver mais de um, todos são devolvidos.
 * O cliente balcão fica de fora, mesmo que o telefone dele deixe de ser nulo.
 */
export async function findCustomersByPhone(phone: string): Promise<Customer[]> {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];

  const exact = await prisma.customer.findMany({
    where: {
      phone: normalized,
      id: { not: COUNTER_CUSTOMER_ID },
    },
    orderBy: { createdAt: "asc" },
  });

  const legacy = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT extracted.id AS id
    FROM (
      SELECT
        digits_only.id,
        CASE
          WHEN length(digits_only.digits) IN (12, 13)
           AND left(digits_only.digits, 2) = '55'
          THEN substring(digits_only.digits FROM 3)
          ELSE digits_only.digits
        END AS national
      FROM (
        SELECT
          "id",
          regexp_replace("phone", '[^0-9]', '', 'g') AS digits
        FROM "Customer"
        WHERE "phone" IS NOT NULL
          AND "id" <> ${COUNTER_CUSTOMER_ID}
          AND "phone" <> ${normalized}
      ) AS digits_only
    ) AS extracted
    WHERE extracted.national = ${normalized}
  `;

  const exactIds = new Set(exact.map((customer) => customer.id));
  const missingIds = legacy
    .map((row) => row.id)
    .filter((id) => !exactIds.has(id));

  if (missingIds.length === 0) return exact;

  const legacyCustomers = await prisma.customer.findMany({
    where: { id: { in: missingIds } },
  });

  return omitCounterCustomer(
    [...exact, ...legacyCustomers].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
    )
  );
}

/**
 * Grava o telefone só com dígitos nacionais quando a normalização é possível.
 * Não apaga valor inválido e não escolhe um cadastro "vencedor" em caso de colisão.
 */
export async function normalizeStoredCustomerPhone(
  db: PhoneWriter,
  customerId: string
): Promise<void> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { id: true, phone: true },
  });

  if (!customer || isCounterCustomerId(customer.id) || !customer.phone) return;

  const normalized = normalizePhone(customer.phone);
  if (!normalized || normalized === customer.phone) return;

  await db.customer.update({
    where: { id: customer.id },
    data: { phone: normalized },
  });
}
