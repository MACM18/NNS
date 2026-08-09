import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const ALLOWED_ROLES = ["admin", "moderator", "superadmin"];

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!ALLOWED_ROLES.includes(String(session.user.role || "user").toLowerCase())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const importId = searchParams.get("importId");
    const date = searchParams.get("date");
    const invoices = await prisma.inventoryInvoice.findMany({
      where: {
        isSystemGenerated: true,
        sourceType: {
          in: [
            "google_material_balance_issue",
            "google_material_balance_adjustment",
            "google_material_balance_reconciliation",
          ],
        },
        ...(importId ? { materialBalanceImportId: importId } : {}),
        ...(date ? { sourceDate: new Date(`${date}T00:00:00.000Z`) } : {}),
        ...(connectionId
          ? { materialBalanceImport: { connectionId } }
          : {}),
      },
      orderBy: [{ sourceDate: "desc" }, { createdAt: "desc" }],
      include: {
        items: { include: { item: { select: { id: true, name: true, unit: true } } } },
      },
    });

    return NextResponse.json({
      data: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        sourceType: invoice.sourceType,
        sourceDate: invoice.sourceDate?.toISOString().slice(0, 10) || null,
        importId: invoice.materialBalanceImportId,
        status: invoice.status,
        totalCost: Number(invoice.totalCost || 0),
        items: invoice.items.map((item) => ({
          id: item.id,
          inventoryItemId: item.itemId,
          itemName: item.item?.name || item.description || "",
          unit: item.unit || item.item?.unit || "",
          quantity: Number(item.quantityIssued || 0),
        })),
      })),
    });
  } catch (error) {
    console.error("[material-balance-invoices] GET failed", error);
    return NextResponse.json({ error: "Failed to load Material Balance invoices" }, { status: 500 });
  }
}
