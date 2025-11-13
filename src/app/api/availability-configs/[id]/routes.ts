import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { availabilityConfigSchema } from "@/lib/validations/availability-config.schema";

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