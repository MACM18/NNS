"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function InvoiceInlineEdit({
  value,
  onSave,
  className,
  placeholder = "Click to edit",
  ariaLabel,
}: {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commit = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };
  if (!editing) return <button type="button" aria-label={`Edit ${ariaLabel}`} title={`Click to edit ${ariaLabel}`} onClick={() => { setDraft(value); setEditing(true); }} className={cn("group inline-flex min-w-0 max-w-full items-center gap-1 rounded-sm text-left outline-none transition hover:bg-sky-50 hover:ring-1 hover:ring-sky-300 focus-visible:ring-2 focus-visible:ring-primary", className)}><span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{value || <span className="text-muted-foreground">{placeholder}</span>}</span><Pencil className="h-3 w-3 shrink-0 text-primary opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 print:hidden" /></button>;
  return <span className="inline-flex min-w-0 max-w-full items-center gap-1 print:hidden"><Input autoFocus aria-label={ariaLabel} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(); } if (event.key === "Escape") cancel(); }} onBlur={commit} className={cn("h-7 min-w-0 px-1 text-sm sm:min-w-20", className)} /><Button type="button" size="icon" variant="ghost" aria-label={`Save ${ariaLabel}`} onMouseDown={event => event.preventDefault()} onClick={commit} className="h-7 w-7 shrink-0"><Check className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`Cancel editing ${ariaLabel}`} onMouseDown={event => event.preventDefault()} onClick={cancel} className="h-7 w-7 shrink-0"><X className="h-3.5 w-3.5" /></Button></span>;
}
