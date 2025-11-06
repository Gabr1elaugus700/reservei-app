/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";

// GET /api/bookings/customer - List customers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
 const { phone } = await params;
 const whatsapp = phone;

  if (!whatsapp) {
    return NextResponse.json(
      { error: "WhatsApp é obrigatório" },
      { status: 400 }
    );
  }

  try {
    // TODO: Aqui você vai buscar no seu banco de dados
    // Por enquanto, simulando uma busca
    const clientesMock = [
      { whatsapp: "11999999999", nome: "João Silva", id: "1" },
      { whatsapp: "11988888888", nome: "Maria Santos", id: "2" },
    ];

    const cliente = clientesMock.find((c) => c.whatsapp === whatsapp);

    if (cliente) {
      return NextResponse.json({
        found: true,
        name: cliente.nome,
        id: cliente.id,
      });
    }

    return NextResponse.json({
      found: false,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}
