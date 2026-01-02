import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { availabilityConfigSchema } from "@/lib/validations/availability-config.schema";
import { syncTimeSlotsForConfig } from "@/lib/timeslot-service";

// GET /api/availability-configs/[id] - Get availability config by ID
export async function GET( request: Request, { params }: { params: Promise<{ id: string }> } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const config = await prisma.availabilityConfig.findUnique({
            where: { id },
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
export async function DELETE( request: Request, { params }: { params: Promise<{ id: string }> } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        // Delete config (cascades to TimeSlots via Prisma schema)
        const config = await prisma.availabilityConfig.delete({
            where: { id },
        });

        if (!config) {
            return NextResponse.json(
                { success: false, message: "Availability config not found" },
                { status: 404 }
            );
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Availability config and related time slots deleted successfully",
            data: config 
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
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


// PUT /api/availability-configs/[id] - Update availability config by ID
export async function PUT( request: Request, { params }: { params: Promise<{ id: string }> } ) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;
        const data = await request.json();
        const parsedData = availabilityConfigSchema.partial().parse(data);
        
        // Converter date de string para Date após validação, se existir
        const dataToUpdate = {
            ...parsedData,
            date: parsedData.date ? new Date(parsedData.date + 'T00:00:00.000Z') : undefined
        };

        // Update config and regenerate time slots in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const updatedConfig = await tx.availabilityConfig.update({
                where: { id },
                data: dataToUpdate,
            });

            // Regenerate time slots for this config
            await syncTimeSlotsForConfig(id, tx);

            return updatedConfig;
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Availability config updated and time slots regenerated",
            data: result 
        }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-cache",
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
