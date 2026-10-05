import { notFound } from "next/navigation";
import { getPublicMonthlyReport } from "@/lib/monthly-report-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shared Monthly Reports | NNS", robots: { index: false, follow: false } };

export default async function SharedMonthlyReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const report = await getPublicMonthlyReport(token);
  if (!report?.currentVersion) notFound();
  const monthName = new Intl.DateTimeFormat("en", { month: "long", timeZone: "Asia/Colombo" }).format(new Date(Date.UTC(report.year, report.month - 1, 1)));
  const documents = report.currentVersion.documents;

  return (
    <main className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <div className="mx-auto min-h-screen max-w-[1600px] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-5 py-6 lg:px-6">
            <a href="#top" className="flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-600">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#164568] text-sm font-bold tracking-wide text-white shadow-sm">NNS</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{report.companyName}</span>
                <span className="mt-0.5 block text-xs text-slate-500">Shared reports</span>
              </span>
            </a>

            <div className="mt-7 hidden rounded-2xl bg-[#f1f7fb] p-4 lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Report period</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#164568]">{monthName}</p>
              <p className="text-sm font-medium text-slate-600">{report.year}</p>
            </div>

            <nav aria-label="Monthly report documents" className="mt-6">
              <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:block">In this report</p>
              <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                {documents.map((doc, index) => (
                  <li key={doc.publicId} className="shrink-0 lg:shrink">
                    <a
                      href={`#report-${doc.publicId}`}
                      className="group flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-50 hover:text-[#164568] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 lg:w-full"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500 group-hover:bg-sky-100 group-hover:text-[#164568]">{String(index + 1).padStart(2, "0")}</span>
                      <span className="max-w-52 truncate font-medium">{doc.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto hidden border-t border-slate-100 pt-5 lg:block">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                <span className="size-2 rounded-full bg-emerald-500" />
                View-only link
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Anyone with this link can view the published reports. They may also save or print the PDFs.</p>
            </div>
          </div>
        </aside>

        <div id="top" className="min-w-0 px-4 py-5 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
          <header className="mb-7 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">Published monthly archive</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{monthName} {report.year}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">A read-only collection of the operational reports for this month.</p>
            </div>
            <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Published
            </div>
          </header>

          <div className="space-y-7">
            {documents.map((doc, index) => {
              const pdfUrl = `/api/public/monthly-reports/${token}/documents/${doc.publicId}`;
              return (
                <section id={`report-${doc.publicId}`} key={doc.publicId} className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,45,65,0.06)]">
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf3f9] text-xs font-bold text-[#164568]">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">{doc.title}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">{monthName} {report.year} · PDF report</p>
                      </div>
                    </div>
                    <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-[#164568] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600" href={pdfUrl} target="_blank" rel="noreferrer">
                      Open PDF <span aria-hidden="true" className="ml-2">↗</span>
                    </a>
                  </div>
                  <iframe title={doc.title} className="h-[68vh] min-h-[420px] w-full bg-slate-100 sm:h-[78vh]" src={pdfUrl} />
                </section>
              );
            })}
          </div>

          <footer className="py-8 text-center text-xs text-slate-500">{report.companyName} · Monthly report archive</footer>
        </div>
      </div>
    </main>
  );
}
