import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Parallel queries for better performance
    const [
      bookingsToday,
      totalCapacityToday,
      bookingsThisWeek,
      bookingsLastWeek,
      nextBooking,
    ] = await Promise.all([
      // Bookings today
      prisma.booking.count({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      }),

      // Total capacity for today
      prisma.timeSlot.aggregate({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
          isAvailable: true,
        },
        _sum: {
          totalCapacity: true,
          availableCapacity: true,
        },
      }),

      // Bookings this week (last 7 days)
      prisma.booking.count({
        where: {
          date: {
            gte: sevenDaysAgo,
            lt: tomorrow,
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      }),

      // Bookings previous week (14-7 days ago)
      prisma.booking.count({
        where: {
          date: {
            gte: fourteenDaysAgo,
            lt: sevenDaysAgo,
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      }),

      // Next upcoming booking
      prisma.booking.findFirst({
        where: {
          date: {
            gte: new Date(),
          },
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        select: {
          date: true,
          time: true,
        },
      }),
    ]);

    // Calculate statistics
    const totalCapacity = totalCapacityToday._sum.totalCapacity || 0;
    const availableCapacity = totalCapacityToday._sum.availableCapacity || 0;
    const occupiedCapacity = totalCapacity - availableCapacity;
    const capacityPercentage =
      totalCapacity > 0 ? Math.round((occupiedCapacity / totalCapacity) * 100) : 0;

    // Calculate occupation rate (bookings vs capacity) for last 7 days
    const totalSlotsWeek = await prisma.timeSlot.aggregate({
      where: {
        date: {
          gte: sevenDaysAgo,
          lt: tomorrow,
        },
        isAvailable: true,
      },
      _sum: {
        totalCapacity: true,
      },
    });

    const totalCapacityWeek = totalSlotsWeek._sum.totalCapacity || 0;
    const occupationRate =
      totalCapacityWeek > 0
        ? Math.round((bookingsThisWeek / totalCapacityWeek) * 100)
        : 0;

    // Calculate trend
    const trendVsYesterday = 0; // Could calculate based on yesterday's bookings
    const trendVsLastWeek =
      bookingsLastWeek > 0
        ? Math.round(
            ((bookingsThisWeek - bookingsLastWeek) / bookingsLastWeek) * 100
          )
        : 0;

    // Count pending bookings today
    const pendingBookingsToday = await prisma.booking.count({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        status: "PENDING",
      },
    });

    // Get next booking details
    let nextBookingTime = "N/A";
    let nextBookingCount = 0;
    let hoursUntilNext = "N/A";

    if (nextBooking) {
      nextBookingTime = nextBooking.time;
      
      // Count bookings for this time slot
      nextBookingCount = await prisma.booking.count({
        where: {
          date: nextBooking.date,
          time: nextBooking.time,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      });

      // Calculate hours until next booking
      const nextBookingDate = new Date(nextBooking.date);
      const [hours, minutes] = nextBooking.time.split(":");
      nextBookingDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const now = new Date();
      const diffMs = nextBookingDate.getTime() - now.getTime();
      const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
      hoursUntilNext = diffHours > 0 ? `${diffHours}h restantes` : "Agora";
    }

    const stats = {
      bookingsToday: {
        value: bookingsToday.toString(),
        description: `${pendingBookingsToday} pendentes de confirmação`,
        trend: trendVsYesterday !== 0 ? `${trendVsYesterday > 0 ? "+" : ""}${trendVsYesterday}% vs ontem` : "Estável",
      },
      capacityToday: {
        value: `${capacityPercentage}%`,
        description: `${occupiedCapacity} de ${totalCapacity} vagas ocupadas`,
        trend: capacityPercentage >= 80 ? "Alta demanda" : "Normal para este período",
      },
      occupationRate: {
        value: `${occupationRate}%`,
        description: "Média dos últimos 7 dias",
        trend: trendVsLastWeek !== 0 ? `${trendVsLastWeek > 0 ? "+" : ""}${trendVsLastWeek}% vs semana passada` : "Estável",
      },
      nextBooking: {
        value: nextBookingTime,
        description: nextBookingCount > 0 ? `${nextBookingCount} visitantes agendados` : "Nenhum agendamento",
        trend: hoursUntilNext,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
