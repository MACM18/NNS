import { notFound } from "next/navigation";
import { getPublicMonthlyReport } from "@/lib/monthly-report-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared Monthly Reports | NNS", robots: { index: false, follow: false } };
export default async function SharedMonthlyReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getPublicMonthlyReport(token);
  if (!report?.currentVersion) notFound();
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(report.year, report.month - 1, 1)));
  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900"><div className="mx-auto max-w-6xl space-y-6"><header className="rounded-xl border bg-white p-6 shadow-sm"><p className="text-sm font-medium text-slate-500">NNS Enterprise · Monthly Reports</p><h1 className="mt-1 text-2xl font-semibold">{monthName} {report.year}</h1><p className="mt-2 text-sm text-slate-600">Read-only reports. PDFs may be saved or printed by viewers.</p></header>{report.currentVersion.documents.map(doc => <section key={doc.publicId} className="overflow-hidden rounded-xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b p-4"><h2 className="font-medium">{doc.title}</h2><a className="text-sm text-blue-700 underline" href={`/api/public/monthly-reports/${token}/documents/${doc.publicId}`} target="_blank" rel="noreferrer">Open PDF</a></div><iframe title={doc.title} className="h-[70vh] w-full" src={`/api/public/monthly-reports/${token}/documents/${doc.publicId}`} /></section>)}</div></main>;
}
