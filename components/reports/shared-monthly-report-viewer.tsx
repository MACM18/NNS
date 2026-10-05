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
    <main className="grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#f3f7fa] text-slate-900 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-full lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:block lg:px-6 lg:py-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#164568] text-sm font-bold tracking-wide text-white shadow-sm">NNS</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{companyName}</span>
              <span className="mt-0.5 block text-xs text-slate-500">Shared reports</span>
            </span>
          </div>
          <div className="shrink-0 text-right lg:mt-7 lg:rounded-2xl lg:bg-[#f1f7fb] lg:p-4 lg:text-left">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:block">Report period</p>
            <p className="text-sm font-semibold text-[#164568] lg:mt-2 lg:text-xl">{monthName} {year}</p>
            <p className="hidden text-sm font-medium text-slate-600 lg:block">Version {versionNumber}</p>
          </div>
        </div>

        <nav aria-label="Monthly report documents" className="min-h-0 px-3 pb-3 lg:flex-1 lg:px-4 lg:pb-4">
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
                    className={`group flex min-h-10 items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-600 lg:min-h-11 lg:gap-3 ${selected ? "border-sky-100 bg-[#edf5fa] text-[#164568]" : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-[#164568]"} lg:w-full`}
                  >
                    <span className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold ${selected ? "bg-[#164568] text-white" : "bg-slate-100 text-slate-500 group-hover:bg-sky-100 group-hover:text-[#164568]"}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span className="max-w-52 truncate font-medium">{doc.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden border-t border-slate-100 px-6 py-5 lg:mt-auto lg:block">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" /> View-only link
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">Anyone with this link can view the published reports. They may also save or print the PDFs.</p>
        </div>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-800">{companyName} · {monthName} {year}</p>
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">{activeDocument.title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">Published report · Version {versionNumber}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Published
            </div>
            <a className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#164568] transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-600" href={pdfUrl} target="_blank" rel="noreferrer">
              Open PDF <span aria-hidden="true" className="ml-2">↗</span>
            </a>
          </div>
        </header>

        <div className="min-h-0 flex-1 p-2 sm:p-4 lg:p-5">
          <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,45,65,0.06)]">
            <iframe key={activeDocument.publicId} title={activeDocument.title} className="block h-full min-h-0 w-full bg-slate-100" src={pdfUrl} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setActiveIndex(index => Math.max(0, index - 1))} disabled={activeIndex === 0} className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#164568] disabled:cursor-not-allowed disabled:opacity-40">← Previous</button>
          <span className="text-xs font-medium tabular-nums text-slate-500">{activeIndex + 1} of {documents.length} reports</span>
          <button type="button" onClick={() => setActiveIndex(index => Math.min(documents.length - 1, index + 1))} disabled={activeIndex === documents.length - 1} className="inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#164568] disabled:cursor-not-allowed disabled:opacity-40">Next →</button>
        </div>
      </section>
    </main>
  );
}
