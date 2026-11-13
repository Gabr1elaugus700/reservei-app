/**
 * Revisa e, com --apply, grava Customer.phone no formato nacional (só dígitos).
 *
 * A migration 20261113140000_normalize_customer_phone faz a mesma gravação no
 * deploy. Este script serve para ver o efeito antes, repetir a normalização
 * e listar duplicados. Não funde clientes e não cria @unique: dois cadastros
 * com o mesmo número continuam existindo para uma decisão manual.
 *
 * Uso:
 *   npx tsx scripts/normalize-customer-phones.ts
 *   npx tsx scripts/normalize-customer-phones.ts --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { normalizePhone } from "../src/lib/phone";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  bookings: number;
};

type Plan = {
  id: string;
  name: string;
  from: string;
  to: string | null;
  bookings: number;
};

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function printList(title: string, rows: Plan[]): void {
  console.log(`\n${title}: ${rows.length}`);
  for (const row of rows) {
    const target = row.to ?? "(inválido, sem alteração)";
    console.log(
      `- ${row.id} | ${row.name} | ${row.bookings} agendamento(s) | ${row.from} -> ${target}`
    );
  }
}

async function main(): Promise<void> {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  const rows: Row[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    bookings: customer._count.bookings,
  }));

  const invalid: Plan[] = [];
  const unchanged: Plan[] = [];
  const updates: Plan[] = [];

  for (const row of rows) {
    if (!row.phone) continue;

    const normalized = normalizePhone(row.phone);
    const plan: Plan = {
      id: row.id,
      name: row.name,
      from: row.phone,
      to: normalized,
      bookings: row.bookings,
    };

    if (!normalized) {
      invalid.push(plan);
      continue;
    }

    if (normalized === row.phone) {
      unchanged.push(plan);
      continue;
    }

    updates.push(plan);
  }

  const groups = new Map<string, Plan[]>();
  for (const row of rows) {
    if (!row.phone) continue;
    const key = normalizePhone(row.phone);
    if (!key) continue;
    const current = groups.get(key) ?? [];
    current.push({
      id: row.id,
      name: row.name,
      from: row.phone,
      to: key,
      bookings: row.bookings,
    });
    groups.set(key, current);
  }

  const duplicates = [...groups.entries()].filter(([, group]) => group.length > 1);

  console.log(apply ? "Modo: aplicar" : "Modo: simulação (use --apply para gravar)");
  console.log(`Clientes lidos: ${rows.length}`);
  printList("Já normalizados", unchanged);
  printList("Serão normalizados", updates);
  printList("Inválidos (mantidos como estão)", invalid);

  console.log(`\nNúmeros compartilhados por mais de um cliente: ${duplicates.length}`);
  for (const [phone, group] of duplicates) {
    console.log(`\n${phone}`);
    for (const row of group) {
      console.log(
        `  - ${row.id} | ${row.name} | origem ${row.from} | ${row.bookings} agendamento(s)`
      );
    }
  }

  if (duplicates.length > 0) {
    console.log(
      "\n@unique não foi adicionado: fundir esses cadastros muda o dono dos agendamentos e fica para uma revisão manual."
    );
  }

  if (!apply) {
    console.log("\nNenhuma linha foi alterada.");
    return;
  }

  for (const row of updates) {
    if (!row.to) continue;
    await prisma.customer.update({
      where: { id: row.id },
      data: { phone: row.to },
    });
  }

  console.log(`\nTelefones atualizados: ${updates.length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
