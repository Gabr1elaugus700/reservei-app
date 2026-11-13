import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import {
  COUNTER_CUSTOMER_ID,
  COUNTER_CUSTOMER_NAME,
} from "../src/lib/counter-customer";

const prisma = new PrismaClient();

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Defina ${name} no .env antes de subir a aplicação.`);
  }
  return value;
}

async function passwordMatches(hash: string, password: string): Promise<boolean> {
  try {
    return await verifyPassword({ hash, password });
  } catch {
    return false;
  }
}

async function ensureCounterCustomer(): Promise<void> {
  await prisma.customer.upsert({
    where: { id: COUNTER_CUSTOMER_ID },
    update: {},
    create: {
      id: COUNTER_CUSTOMER_ID,
      name: COUNTER_CUSTOMER_NAME,
      phone: null,
      email: null,
    },
  });
  console.log("Cliente balcão pronto.");
}

async function ensureAdmin(): Promise<void> {
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");
  const name = readEnv("SEED_ADMIN_NAME") ?? "Administrador";

  if (!email.includes("@") || email.includes(" ")) {
    throw new Error("SEED_ADMIN_EMAIL precisa ser um e-mail válido.");
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD precisa ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`
    );
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: true },
    create: {
      email,
      name,
      emailVerified: true,
    },
  });

  const passwordHash = await hashPassword(password);
  const credential = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    orderBy: { createdAt: "asc" },
  });

  if (!credential) {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    });
    console.log(`Admin criado (${email}).`);
    return;
  }

  const currentPassword = credential.password ?? "";
  const samePassword =
    currentPassword.length > 0 && (await passwordMatches(currentPassword, password));

  if (!samePassword) {
    await prisma.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
    console.log(`Admin já existia (${email}); senha atualizada a partir do ambiente.`);
    return;
  }

  console.log(`Admin já existia (${email}).`);
}

async function main(): Promise<void> {
  await ensureCounterCustomer();
  await ensureAdmin();
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
