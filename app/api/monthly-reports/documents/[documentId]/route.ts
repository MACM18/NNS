import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPrivateMonthlyReportDocument } from "@/lib/monthly-report-service";
export async function GET(_request: Request, context: { params: Promise<{ documentId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { documentId } = await context.params;
  const doc = await getPrivateMonthlyReportDocument(documentId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(Buffer.from(doc.pdfBytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.fileName.replace(/[\r\n\"]+/g, "_")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
