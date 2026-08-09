import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { recordInventoryStockEvent } from "@/lib/inventory-stock-event-service";

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
          invoiceNumber: { startsWith: `INV-${year}` },
        },
        orderBy: { invoiceNumber: "desc" },
      });

      let nextNumber = 1;
      if (lastInvoice?.invoiceNumber) {
        const match = lastInvoice.invoiceNumber.match(/INV-\d{4}-(\d+)/);
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
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = invoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      warehouse: inv.warehouse,
      date: inv.date ? inv.date.toISOString().slice(0, 10) : null,
      issued_by: inv.issuedBy || "",
      drawn_by: inv.drawnBy || "",
      total_items: Number(inv.totalItems || 0),
      status: inv.status,
      source_type: inv.sourceType || null,
      source_key: inv.sourceKey || null,
      material_balance_import_id: inv.materialBalanceImportId || null,
      source_date: inv.sourceDate?.toISOString().slice(0, 10) || null,
      is_system_generated: inv.isSystemGenerated,
      created_at: inv.createdAt?.toISOString(),
      updated_at: inv.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ data: formatted });
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
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, role: true },
    });
    if (!["admin", "moderator", "superadmin"].includes((profile?.role || "").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { items, sourceType: _sourceType, sourceKey: _sourceKey, materialBalanceImportId: _importId, isSystemGenerated: _systemGenerated, ...invoiceData } = body;

    // Create invoice with items in a transaction
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Create the invoice
        const invoice = await tx.inventoryInvoice.create({
          data: {
            ...invoiceData,
            createdById: profile?.id || null,
            totalItems: items?.length || 0,
          },
        });

        // Process items if provided
        if (items && items.length > 0) {
          for (const item of items) {
            // Create invoice item
            await tx.inventoryInvoiceItem.create({
              data: {
                invoiceId: invoice.id,
                itemId: item.item_id ?? item.itemId,
                description: item.description,
                unit: item.unit,
                quantityRequested: Number(
                  item.quantity_requested ?? item.quantityRequested
                ),
                quantityIssued: Number(
                  item.quantity_issued ?? item.quantityIssued
                ),
              },
            });

            // Update inventory stock
            const inventoryItem = await tx.inventoryItem.findUnique({
              where: { id: item.item_id ?? item.itemId },
            });

            if (inventoryItem) {
              const currentStock = Number(inventoryItem.currentStock || 0);
              await tx.inventoryItem.update({
                where: { id: item.item_id ?? item.itemId },
                data: {
                  currentStock:
                    currentStock +
                    Number(item.quantity_issued ?? item.quantityIssued),
                },
              });
              await recordInventoryStockEvent(tx, {
                inventoryItemId: inventoryItem.id,
                previousStock: currentStock,
                newStock: currentStock + Number(item.quantity_issued ?? item.quantityIssued),
                sourceType: "inventory_receipt",
                sourceReferenceId: invoice.id,
                createdById: profile?.id || null,
                reason: `Inventory receipt ${invoice.invoiceNumber}`,
              });

              // Create drum tracking for cable items
              if (
                inventoryItem.name?.toLowerCase().includes("drop wire cable") &&
                item.drum_number
              ) {
                await tx.drumTracking.create({
                  data: {
                    drumNumber: item.drum_number ?? item.drumNumber,
                    itemId: item.item_id ?? item.itemId,
                    initialQuantity: Number(
                      item.quantity_issued ?? item.quantityIssued
                    ),
                    currentQuantity: Number(
                      item.quantity_issued ?? item.quantityIssued
                    ),
                    receivedDate: new Date(invoiceData.date),
                    status: "active",
                  },
                });
              }
            }
          }
        }

        return invoice;
      }
    );

    const created = result;
    const formatted = {
      id: created.id,
      invoice_number: created.invoiceNumber,
      warehouse: created.warehouse,
      date: created.date ? created.date.toISOString().slice(0, 10) : null,
      issued_by: created.issuedBy || "",
      drawn_by: created.drawnBy || "",
      total_items: Number(created.totalItems || 0),
      status: created.status,
      source_type: created.sourceType || null,
      source_key: created.sourceKey || null,
      material_balance_import_id: created.materialBalanceImportId || null,
      source_date: created.sourceDate?.toISOString().slice(0, 10) || null,
      is_system_generated: created.isSystemGenerated,
      created_at: created.createdAt?.toISOString(),
      updated_at: created.updatedAt?.toISOString(),
    };

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Error creating inventory invoice:", error);
    return NextResponse.json(
      { error: "Failed to create inventory invoice" },
      { status: 500 }
    );
  }
}
