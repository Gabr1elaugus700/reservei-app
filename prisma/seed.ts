import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Criar usuário administrador padrão
  const adminEmail = "admin@admin.com";
  const adminName = "Administrador";
  const adminPassword = "admin123";

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
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

    console.log("✅ Usuário administrador criado com sucesso!");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Senha: ${adminPassword}`);
    console.log("   ⚠️  IMPORTANTE: Altere a senha após o primeiro login!");
  } else {
    console.log("ℹ️  Usuário administrador já existe");
    console.log(`   Email: ${adminEmail}`);
  }

  console.log("✅ Seed concluído!");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
    await prisma.$disconnect();
  });
}