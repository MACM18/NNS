import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const generateNumber = searchParams.get("generateNumber");

    // If requesting invoice number generation
    if (generateNumber === "true") {
      const year = new Date().getFullYear();
      const lastInvoice = await prisma.inventoryInvoice.findFirst({
        where: {
          invoice_number: { startsWith: `INV-${year}` },
        },
        orderBy: { invoice_number: "desc" },
      });

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const match = lastInvoice.invoice_number.match(/INV-\d{4}-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const invoiceNumber = `INV-${year}-${nextNumber
        .toString()
        .padStart(4, "0")}`;
      return NextResponse.json({ data: invoiceNumber });
    }

    const invoices = await prisma.inventoryInvoice.findMany({
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching inventory invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory invoices" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { items, ...invoiceData } = body;

    // Create invoice with items in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create the invoice
      const invoice = await tx.inventoryInvoice.create({
        data: {
          ...invoiceData,
          created_by: session.user?.id,
          total_items: items?.length || 0,
        },
      });

      // Process items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          // Create invoice item
          await tx.inventoryInvoiceItem.create({
            data: {
              invoice_id: invoice.id,
              item_id: item.item_id,
              description: item.description,
              unit: item.unit,
              quantity_requested: Number(item.quantity_requested),
              quantity_issued: Number(item.quantity_issued),
            },
          });

          // Update inventory stock
          const inventoryItem = await tx.inventoryItem.findUnique({
            where: { id: item.item_id },
          });

          if (inventoryItem) {
            const currentStock = inventoryItem.current_stock || 0;
            await tx.inventoryItem.update({
              where: { id: item.item_id },
              data: {
                current_stock: currentStock + Number(item.quantity_issued),
                updated_at: new Date(),
              },
            });

            // Create drum tracking for cable items
            if (
              inventoryItem.name?.toLowerCase().includes("drop wire cable") &&
              item.drum_number
            ) {
              await tx.drumTracking.create({
                data: {
                  drum_number: item.drum_number,
                  item_id: item.item_id,
                  initial_quantity: Number(item.quantity_issued),
                  current_quantity: Number(item.quantity_issued),
                  received_date: new Date(invoiceData.date),
                  status: "active",
                },
              });
            }
          }
        }
      }

      return invoice;
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Error creating inventory invoice:", error);
    return NextResponse.json(
      { error: "Failed to create inventory invoice" },
      { status: 500 }
    );
  }
}
