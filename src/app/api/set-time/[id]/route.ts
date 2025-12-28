import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-service";
import { z } from "zod";

const syncTimeSchema = z.object({
    id: z.string(),
    syncedAt: z
        .string()
        .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Formato inválido, use DD/MM/YYYY")
        .transform((s) => {
            const [day, month, year] = s.split("/").map(Number);
            return new Date(year, month - 1, day);
        })
        .refine((d) => d instanceof Date && !isNaN(d.getTime()), { message: "Data inválida" }),
});

// PUT /api/availability-configs/:id - Update availability config
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }
        const { id } = await params;
        const body = await request.json();
        const parsedData = syncTimeSchema.parse(body);
        const updatedSync = await prisma.lastConfigSync.update({
            where: { id },
            data: {
                syncedAt: parsedData.syncedAt,
            },
        });

        if (!updatedSync) {
            return NextResponse.json(
                { success: false, message: "Failed to update sync time" },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { success: true, data: updatedSync },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating last config sync time:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}