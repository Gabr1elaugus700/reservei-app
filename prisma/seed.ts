import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Criando usuário administrador...");

  const adminEmail = "admin@reservei.com";
  const adminPassword = "Admin@123";

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log("ℹ️  Usuário admin já existe");
    return;
  }

  const passwordHash = await hash(adminPassword, 10);
  
  const user = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Administrador",
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      providerId: "credential",
      accountId: adminEmail,
      password: passwordHash,
    },
  });

  console.log("✅ Usuário admin criado!");
  console.log(`   📧 Email: ${adminEmail}`);
  console.log(`   🔑 Senha: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });