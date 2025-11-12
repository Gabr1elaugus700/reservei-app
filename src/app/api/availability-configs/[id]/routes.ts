import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

// GET /api/availability-configs/[id] - Get availability config by ID
export async function GET( request: Request, { params }: { params: { id: string } } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const config = await prisma.availabilityConfig.findUnique({
            where: { id: params.id },
        });

        if (!config) {
            return NextResponse.json(
                { success: false, message: "Availability config not found" },
                { status: 404 }
            );
        }

        return new Response(JSON.stringify(config), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("Error fetching availability config:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// DELETE /api/availability-configs/[id] - Delete availability config by ID
export async function DELETE( request: Request, { params }: { params: { id: string } } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const config = await prisma.availabilityConfig.delete({
            where: { id: params.id },
        });

        if (!config) {
            return NextResponse.json(
                { success: false, message: "Availability config not found" },
                { status: 404 }
            );
        }

        return new Response(JSON.stringify(config), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("Error deleting availability config:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}

// Schema for validating availability config data
const availabilityConfigSchema = z.object({
    id: z.string(),
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 (Sunday) to 6 (Saturday)
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  slotDurationMinutes: z.number().min(1).default(30),
  capacityPerSlot: z.number().min(1).default(1),
  isException: z.boolean().default(false),
  isActive: z.boolean().default(true),
  date: z.string().optional(),
});

// PUT /api/availability-configs/[id] - Update availability config by ID
export async function PUT( request: Request, { params }: { params: { id: string } } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const data = await request.json();
        const parsedData = availabilityConfigSchema.partial().parse(data);

        const updatedConfig = await prisma.availabilityConfig.update({
            where: { id: params.id },
            data: parsedData,
        });

        return new Response(JSON.stringify(updatedConfig), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("Error updating availability config:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}