import { NextResponse } from "next/server";
import { getPublicMonthlyReportDocument } from "@/lib/monthly-report-service";
export async function GET(_request: Request, context: { params: Promise<{ token: string; publicId: string }> }) {
  const { token, publicId } = await context.params;
  const doc = await getPublicMonthlyReportDocument(token, publicId);
  if (!doc) return NextResponse.json({ error: "Report not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new NextResponse(Buffer.from(doc.pdfBytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.fileName.replace(/[\r\n\"]+/g, "_")}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
}
