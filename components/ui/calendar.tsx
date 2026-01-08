"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type DateRange = { from?: Date; to?: Date };

type CalendarSingleProps = {
  mode?: "single";
  selected?: Date;
  onSelect?: (date?: Date) => void;
};

type CalendarRangeProps = {
  mode: "range";
  selected?: DateRange;
  onSelect?: (range?: DateRange) => void;
};

export type CalendarProps = (CalendarSingleProps | CalendarRangeProps) &
  React.HTMLAttributes<HTMLDivElement> &
  Record<string, unknown>;

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateFromInput(value: string): Date | undefined {
  // value is expected as YYYY-MM-DD
  const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!match) return undefined;
  const [yyyy, mm, dd] = value.split("-").map((v) => Number(v));
  if (!yyyy || !mm || !dd) return undefined;
  // Construct as local date to avoid timezone shifting.
  return new Date(yyyy, mm - 1, dd);
}

function Calendar({ className, ...props }: CalendarProps) {
  const { mode = "single", selected, onSelect, ...rest } = props as any;

  if (mode === "range") {
    const range = selected as DateRange | undefined;
    const handleSelect = onSelect as ((range?: DateRange) => void) | undefined;

    const fromValue = range?.from ? formatDateForInput(range.from) : "";
    const toValue = range?.to ? formatDateForInput(range.to) : "";

    return (
      <div {...rest} className={cn("p-3", className)}>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>From</span>
            <Input
              type='date'
              value={fromValue}
              onChange={(e) => {
                const from = parseDateFromInput(e.target.value);
                const next: DateRange = {
                  from,
                  to: range?.to,
                };
                if (next.from && next.to && next.from > next.to) {
                  next.to = undefined;
                }
                handleSelect?.(next);
              }}
            />
          </div>

          <div className='grid gap-1'>
            <span className='text-xs text-muted-foreground'>To</span>
            <Input
              type='date'
              value={toValue}
              onChange={(e) => {
                const to = parseDateFromInput(e.target.value);
                const next: DateRange = {
                  from: range?.from,
                  to,
                };
                if (next.from && next.to && next.to < next.from) {
                  next.from = undefined;
                }
                handleSelect?.(next);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const date = selected as Date | undefined;
  const handleSelect = onSelect as ((date?: Date) => void) | undefined;

  const value = date ? formatDateForInput(date) : "";
  return (
    <div {...rest} className={cn("p-3", className)}>
      <Input
        type='date'
        value={value}
        onChange={(e) => {
          const next = parseDateFromInput(e.target.value);
          handleSelect?.(next);
        }}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
