import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findCustomersByPhone } from "@/lib/customers";
import { normalizePhone } from "@/lib/phone";

// GET /api/customer?phone=11999999999 - Find customer by phone
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone parameter is required" },
        { status: 400 }
      );
    }

    if (!normalizePhone(phone)) {
      return NextResponse.json(
        { success: false, message: "Número de WhatsApp inválido" },
        { status: 400 }
      );
    }

    const [customer] = await findCustomersByPhone(phone);

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error("Error finding customer:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/customer - Create new customer
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { name, phone } = data;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and phone are required" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, message: "Número de WhatsApp inválido" },
        { status: 400 }
      );
    }

    const [existingCustomer] = await findCustomersByPhone(normalizedPhone);

    if (existingCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer already exists" },
        { status: 409 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone: normalizedPhone,
      },
    });

    return NextResponse.json(
      { success: true, data: customer },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}