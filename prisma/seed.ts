import { PrismaClient, BookingStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Garantir usuário admin padrão
  const adminEmail = "admin@admin.com";
  const adminName = "administrador";
  const adminPassword = "admin";

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
        providerId: "email",
        accountId: adminEmail,
        password: passwordHash,
      },
    });

    console.log(`✔ Admin criado: ${adminEmail} (senha: ${adminPassword})`);
  } else {
    console.log(`ℹ Admin já existe: ${adminEmail}`);
  }

  // Criar capacidades semanais padrão (global)
  const weeklyCapacities = [
    {
      dayOfWeek: 0,
      capacityPerSlot: 20,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Domingo
    {
      dayOfWeek: 1,
      capacityPerSlot: 30,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Segunda
    {
      dayOfWeek: 2,
      capacityPerSlot: 30,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Terça
    {
      dayOfWeek: 3,
      capacityPerSlot: 30,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Quarta
    {
      dayOfWeek: 4,
      capacityPerSlot: 30,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Quinta
    {
      dayOfWeek: 5,
      capacityPerSlot: 35,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Sexta
    {
      dayOfWeek: 6,
      capacityPerSlot: 40,
      isActive: true,
      slotDurationMinutes: 30,
      startTime: "08:00",
      endTime: "18:00",
    }, // Sábado
  ];

  for (const capacity of weeklyCapacities) {
    await prisma.availabilityConfig.create({
      data: capacity,
    });
    if (capacity.dayOfWeek === 0) {
      console.log(
        "✔ Configuração de capacidade semanal criada para todos os dias da semana."
      );
    }
  }

  const customerConfig = [
    { name: "Cliente 1", email: "cliente1@example.com", phone: "123456789" },
  ]

  for (const customer of customerConfig) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { email: customer.email },
    });

    if (!existingCustomer) {
      const createdCustomer = await prisma.customer.create({
      data: customer,
      });
      console.log(`✔ Cliente criado: ${customer.name} (id: ${createdCustomer.id})`);
      const customerId = createdCustomer.id;
      return customerId;
    } 

  const customerIdBooking = await prisma.customer.findFirst();
  const customerId = customerIdBooking?.id;
  console.log(`Using customer ID for bookings: ${customerId}`);


  const bookingsInitial = [
    { customerId: customerId, date: new Date("2025-11-10"), time: "10:00", status: BookingStatus.CONFIRMED, adults: 2, children: 0, totalPrice: 100.0 },
  ];

  for (const booking of bookingsInitial) {
    await prisma.booking.create({
      data: {
        customerId: booking.customerId!,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        adults: booking.adults,
        children: booking.children,
        totalPrice: booking.totalPrice,
      },
    });
  }
  // const timeSlotsConfig = [
  //   { date : new Date("2025-11-12"), capacityPerSlot: 15, isActive: true, slotDurationMinutes: 30, startTime: "08:00", endTime: "14:00" },
  // ]

  // Criar algumas datas especiais de exemplo (global)
  // const specialDates = [
  //   {
  //     date: new Date("2025-12-25"),
  //     limit: 0,
  //     description: "Natal - Fechado",
  //   },
  //   {
  //     date: new Date("2025-12-31"),
  //     limit: 50,
  //     description: "Reveillon - Capacidade especial",
  //   },
  //   {
  //     date: new Date("2025-01-01"),
  //     limit: 0,
  //     description: "Ano Novo - Fechado",
  //   },
  // ];

  //   for (const specialDate of specialDates) {
  //     await prisma.specialDateCapacity.upsert({
  //       where: { date: specialDate.date },
  //       update: {
  //         limit: specialDate.limit,
  //         description: specialDate.description,
  //       },
  //       create: {
  //         date: specialDate.date,
  //         limit: specialDate.limit,
  //         description: specialDate.description,
  //       },
  //     });
  //   }

  //   console.log("Configurações de capacidade globais criadas/atualizadas.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
}