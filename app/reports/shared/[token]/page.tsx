import { notFound } from "next/navigation";
import { SharedMonthlyReportViewer } from "@/components/reports/shared-monthly-report-viewer";
import { getPublicMonthlyReport } from "@/lib/monthly-report-service";

export const dynamic = "force-dynamic";

export default async function SharedMonthlyReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getPublicMonthlyReport(token);
  if (!report?.sharedVersion) notFound();
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(report.year, report.month - 1, 1)));

  return (
    <SharedMonthlyReportViewer
      token={token}
      companyName={report.companyName}
      monthName={monthName}
      year={report.year}
      versionNumber={report.sharedVersion.version}
      documents={report.sharedVersion.documents}
    />
  );
}
