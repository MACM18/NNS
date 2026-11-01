import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { clearApprovedDeletedLine, lineSnapshot, processLineWrite, SHEET_LINE_FIELDS } from "@/lib/google-sheet-line-sync";
import { processIssuedWrite } from "@/lib/google-sheet-issued-sync";
import { syncConnection } from "@/app/dashboard/integrations/google-sheets/actions";
import { recalculateDrumWithHistory } from "@/lib/drum-tracking-service";

async function manager() {
  const session = await auth();
  return session?.user?.id && ["admin", "moderator", "superadmin"].includes((session.user.role || "").toLowerCase());
}

export async function GET() {
  if (!(await manager())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [lineStates, issuedStates] = await Promise.all([
    prisma.googleSheetLineSync.findMany({ where: { status: { in: ["review", "pending"] } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.googleSheetIssuedSync.findMany({ where: { status: { in: ["review", "pending"] } }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);
  const lineIds = lineStates.map((state) => state.lineId);
  const itemIds = issuedStates.map((state) => state.inventoryItemId);
  const [lines, items, connections, contributions] = await Promise.all([
    prisma.lineDetails.findMany({ where: { id: { in: lineIds } }, select: { id: true, telephoneNo: true, date: true } }),
    prisma.inventoryItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true } }),
    prisma.googleSheetConnection.findMany({ where: { id: { in: [...new Set([...lineStates, ...issuedStates].map((state) => state.connectionId))] } }, select: { id: true, month: true, year: true } }),
    prisma.googleSheetInvoiceContribution.findMany({ where: { connectionId: { in: [...new Set(issuedStates.map((state) => state.connectionId))] } }, select: { connectionId: true, inventoryItemId: true, sourceDate: true, quantity: true } }),
  ]);
  return NextResponse.json({
    lines: lineStates.map((state) => ({
      id: state.lineId, connectionId: state.connectionId, period: connections.find((connection) => connection.id === state.connectionId),
      telephoneNo: lines.find((line) => line.id === state.lineId)?.telephoneNo || null,
      sheetRow: state.sheetRow, status: state.status, operation: state.pendingOperation, fields: state.conflictFields,
      error: state.lastError, updatedAt: state.updatedAt,
    })),
    issued: issuedStates.map((state) => ({
      id: state.id, connectionId: state.connectionId, period: connections.find((connection) => connection.id === state.connectionId),
      item: items.find((item) => item.id === state.inventoryItemId)?.name || "Inventory item",
      date: state.sourceDate.toISOString().slice(0, 10), observedValue: state.observedValue == null ? null : Number(state.observedValue),
      proposedValue: contributions.filter((entry) => entry.connectionId === state.connectionId && entry.inventoryItemId === state.inventoryItemId && entry.sourceDate.getTime() === state.sourceDate.getTime())
        .reduce((sum, entry) => sum + Number(entry.quantity), 0),
      status: state.status, error: state.lastError, updatedAt: state.updatedAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await manager())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || typeof body.action !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (body.action === "approve_issued") {
    const state = await prisma.googleSheetIssuedSync.findUnique({ where: { id: body.id } });
    if (!state || state.status !== "review" || state.observedValue === null) return NextResponse.json({ error: "Issued review is no longer available" }, { status: 409 });
    await prisma.googleSheetIssuedSync.update({ where: { id: state.id }, data: { status: "pending", sheetValue: state.observedValue, lastError: null } });
    await processIssuedWrite(state.id);
    return NextResponse.json({ ok: true });
  }
  const state = await prisma.googleSheetLineSync.findUnique({ where: { lineId: body.id } });
  if (!state || state.status !== "review") return NextResponse.json({ error: "Line review is no longer available" }, { status: 409 });
  if (body.action === "clear_sheet" && state.pendingOperation === "delete") {
    await clearApprovedDeletedLine(state.lineId);
    return NextResponse.json({ ok: true });
  }
  const line = await prisma.lineDetails.findUnique({ where: { id: state.lineId } });
  if (!line) return NextResponse.json({ error: "Line no longer exists" }, { status: 409 });
  if (body.action === "keep_app") {
    await prisma.googleSheetLineSync.update({ where: { lineId: state.lineId }, data: {
      status: "pending", pendingOperation: "overwrite",
      pendingFields: state.conflictFields.includes("sheet_row") ? [...SHEET_LINE_FIELDS, "wastage"] : state.conflictFields.filter((field) => field !== "sheet_row"),
      conflictFields: [], lastError: null, appTouched: true,
    } });
    await processLineWrite(state.lineId);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "keep_sheet" && !state.conflictFields.includes("sheet_row")) {
    await prisma.googleSheetLineSync.update({ where: { lineId: state.lineId }, data: {
      baseline: lineSnapshot(line as any), status: "synced", pendingOperation: null,
      pendingFields: [], conflictFields: [], appTouched: false, lastError: null,
    } });
    await syncConnection(state.connectionId);
    return NextResponse.json({ ok: true });
  }
  if (body.action === "remove_app" && state.conflictFields.includes("sheet_row") && state.pendingOperation !== "delete") {
    const usages = await prisma.drumUsage.findMany({ where: { lineDetailsId: state.lineId }, select: { drumId: true } });
    await prisma.$transaction(async (tx) => {
      await tx.task.updateMany({ where: { lineDetailsId: state.lineId }, data: { lineDetailsId: null } });
      await tx.lineAssignee.deleteMany({ where: { lineId: state.lineId } });
      await tx.drumUsage.deleteMany({ where: { lineDetailsId: state.lineId } });
      await tx.lineDetails.delete({ where: { id: state.lineId } });
      await tx.googleSheetLineSync.delete({ where: { lineId: state.lineId } });
    });
    for (const drumId of new Set(usages.map((usage) => usage.drumId).filter((id): id is string => Boolean(id)))) {
      await recalculateDrumWithHistory(drumId);
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "This action does not apply to the selected conflict" }, { status: 400 });
}
