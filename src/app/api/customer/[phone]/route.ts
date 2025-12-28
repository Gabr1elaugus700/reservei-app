import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customer/[phone] - Find customer by phone/WhatsApp
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
 const { phone } = await params;

  if (!phone) {
    return NextResponse.json(
      { error: "Telefone é obrigatório" },
      { status: 400 }
    );
  }

  try {
    // Buscar cliente no banco de dados pelo telefone
    const customer = await prisma.customer.findFirst({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });

    if (customer) {
      return NextResponse.json({
        found: true,
        name: customer.name,
        id: customer.id,
        email: customer.email,
        whatsapp: customer.phone, // Retorna como whatsapp para compatibilidade com frontend
      });
    }

    return NextResponse.json({
      found: false,
    });
  } catch (error) {
    console.error("Error finding customer:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
  }
}
