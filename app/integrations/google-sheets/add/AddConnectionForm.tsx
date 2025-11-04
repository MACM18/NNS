"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Props = {
  action: (formData: FormData) => Promise<any>;
};

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - i));

export default function AddConnectionForm({ action }: Props) {
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form action={action} className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Month</Label>
            <input name="month" type="hidden" value={month} />
            <Select onValueChange={(v) => setMonth(v)} value={month}>
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Year</Label>
            <input name="year" type="hidden" value={year} />
            <Select onValueChange={(v) => setYear(v)} value={year}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Google Sheet URL</Label>
          <Input
            name="sheet_url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Sheet Name (Tab)</Label>
          <Input
            name="sheet_name"
            type="text"
            placeholder="Sheet tab name (optional)"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />
        </div>

        {/* Hidden inputs to submit controlled Select values */}
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="year" value={year} />

        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <a href="/integrations/google-sheets">Cancel</a>
          </Button>
          <Button type="submit">Connect Sheet</Button>
        </div>
      </form>
    </div>
  );
}
