import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { MaterialBalanceStockSource } from "@/types/material-balance";

type StockDbClient = typeof prisma | Prisma.TransactionClient;

export async function recordInventoryStockEvent(
  tx: StockDbClient,
  input: {
    inventoryItemId: string;
    previousStock: number;
    newStock: number;
    sourceType: MaterialBalanceStockSource | string;
    sourceReferenceId?: string | null;
    materialBalanceImportId?: string | null;
    createdById?: string | null;
    reason?: string | null;
  }
) {
  if (Math.abs(input.newStock - input.previousStock) <= 0.01) return null;

  return tx.inventoryStockEvent.create({
    data: {
      inventoryItemId: input.inventoryItemId,
      sourceType: input.sourceType,
      sourceReferenceId: input.sourceReferenceId || null,
      materialBalanceImportId: input.materialBalanceImportId || null,
      previousStock: input.previousStock,
      newStock: input.newStock,
      quantityDelta: input.newStock - input.previousStock,
      createdById: input.createdById || null,
      reason: input.reason || null,
    },
  });
}
