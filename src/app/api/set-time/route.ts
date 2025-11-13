import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

// GET /api/availability-configs - Get all availability configs
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    const lastSync = await prisma.lastConfigSync.findFirst({
      orderBy: { syncedAt: "desc" },
    });

    if (!lastSync) {
      return NextResponse.json(
        { success: false, message: "No sync record found" },
        { status: 404 }
      );
    }
    return new Response(JSON.stringify({ syncedAt: lastSync.syncedAt }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30000, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error fetching last config sync time:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

const syncTimeSchema = z.object({
    syncedAt: z
        .string()
        .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Formato inválido, use DD/MM/YYYY")
        .transform((s) => {
            const [day, month, year] = s.split("/").map(Number);
            return new Date(year, month - 1, day);
        })
        .refine((d) => d instanceof Date && !isNaN(d.getTime()), { message: "Data inválida" }),
});

// POST /api/set-time - Update last config sync time
export async function POST(request: Request, ) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsedData = syncTimeSchema.parse(body);
    const newSync = await prisma.lastConfigSync.create({
      data: {
        syncedAt: parsedData.syncedAt,
      },
    });

    if (!newSync) {
      return NextResponse.json(
        { success: false, message: "Failed to update sync time" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: newSync },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error updating last config sync time:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}