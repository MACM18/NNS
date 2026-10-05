"use client";

import { useState } from "react";

type SharedDocument = { publicId: string; reportType: string; title: string; fileName: string };
type Props = { token: string; companyName: string; monthName: string; year: number; versionNumber: number; documents: SharedDocument[] };

export function SharedMonthlyReportViewer({ token, companyName, monthName, year, versionNumber, documents }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeDocument = documents[activeIndex];
  const pdfUrl = activeDocument ? `/api/public/monthly-reports/${token}/documents/${activeDocument.publicId}` : "";

  if (!activeDocument) return null;

  return (
    <main className="min-h-screen bg-[#f3f7fa] text-slate-900">
      <div className="mx-auto min-h-screen max-w-[1600px] lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-[272px] lg:flex-none lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="px-5 py-6 lg:flex lg:min-h-full lg:flex-col lg:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#164568] text-sm font-bold tracking-wide text-white shadow-xs">NNS</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">{companyName}</span>
                <span className="mt-0.5 block text-xs text-slate-500">Shared reports</span>
              </span>
            </div>

            <div className="mt-7 hidden rounded-2xl bg-[#f1f7fb] p-4 lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Report period</p>
              <p className="mt-2 text-xl font-semibold tracking-tight text-[#164568]">{monthName}</p>
              <p className="text-sm font-medium text-slate-600">{year} · Version {versionNumber}</p>
            </div>

            <nav aria-label="Monthly report documents" className="mt-6">
              <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 lg:block">In this report</p>
              <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                {documents.map((doc, index) => {
                  const selected = index === activeIndex;
                  return (
                    <li key={doc.publicId} className="shrink-0 lg:shrink">
                      <button
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => setActiveIndex(index)}
                        className={`group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-600 lg:w-full ${selected ? "border-sky-100 bg-[#edf5fa] text-[#164568]" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-[#164568]"}`}
                      >
                        <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${selected ? "bg-[#164568] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-[#164568]"}`}>{String(index + 1).padStart(2, "0")}</span>
                        <span className="max-w-52 truncate font-medium">{doc.title}</span>
                      </button>
                    </li>
                  );
                })}
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

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-7 sm:py-8 lg:px-10 lg:py-9">
          <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-800">{companyName} · {monthName} {year}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{activeDocument.title}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Published monthly report · Version {versionNumber} · PDF</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Published
              </div>
              <a className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-[#164568] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-600" href={pdfUrl} target="_blank" rel="noreferrer">
                Open PDF <span aria-hidden="true" className="ml-2">↗</span>
              </a>
            </div>
          </header>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,45,65,0.06)]">
            <iframe key={activeDocument.publicId} title={activeDocument.title} className="h-[72vh] min-h-[480px] w-full bg-slate-100 sm:h-[80vh]" src={pdfUrl} />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setActiveIndex(index => Math.max(0, index - 1))} disabled={activeIndex === 0} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-[#164568] disabled:cursor-not-allowed disabled:opacity-40">← Previous report</button>
            <span className="text-xs font-medium tabular-nums text-slate-500">{activeIndex + 1} of {documents.length}</span>
            <button type="button" onClick={() => setActiveIndex(index => Math.min(documents.length - 1, index + 1))} disabled={activeIndex === documents.length - 1} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-white hover:text-[#164568] disabled:cursor-not-allowed disabled:opacity-40">Next report →</button>
          </div>

          <footer className="py-7 text-center text-xs text-slate-500">{companyName} · Monthly report archive</footer>
        </section>
      </div>
    </main>
  );
}
