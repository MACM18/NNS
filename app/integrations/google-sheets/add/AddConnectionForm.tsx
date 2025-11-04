"use client";

import React, { useEffect, useState } from "react";
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
import { getSupabaseClient } from "@/lib/supabase";

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

const years = Array.from({ length: 6 }, (_, i) =>
  String(new Date().getFullYear() - i)
);

export default function AddConnectionForm({ action }: Props) {
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [sheetName, setSheetName] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");

  // Fetch a short-lived access token so server actions can authenticate without cookies
  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setAccessToken(data.session?.access_token ?? "");
        }
      } catch {
        if (!cancelled) setAccessToken("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Client-side pre-submit validation to avoid accidental submission of the page URL
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    if (!sheetUrl || sheetUrl.trim() === "") {
      e.preventDefault();
      // eslint-disable-next-line no-alert
      alert("Please enter the Google Sheet URL before submitting.");
      return;
    }
    // Basic check to avoid accidentally submitting the current page URL
    try {
      const parsed = new URL(sheetUrl);
      const path = parsed.pathname || "";
      if (
        parsed.hostname === window.location.hostname &&
        path.startsWith("/integrations")
      ) {
        e.preventDefault();
        // eslint-disable-next-line no-alert
        alert(
          "It looks like you pasted the integration page URL. Please paste the Google Sheet URL (docs.google.com/spreadsheets/...)."
        );
        return;
      }
    } catch {
      // If URL parsing fails, let server-side validation handle it
    }
  };

  return (
    <div className='max-w-2xl mx-auto p-4'>
      <form action={action} onSubmit={handleSubmit} className='grid gap-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <Label>Month</Label>
            <input name='month' type='hidden' value={month} />
            <Select onValueChange={(v) => setMonth(v)} value={month}>
              <SelectTrigger>
                <SelectValue placeholder='Select month' />
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
            <input name='year' type='hidden' value={year} />
            <Select onValueChange={(v) => setYear(v)} value={year}>
              <SelectTrigger>
                <SelectValue placeholder='Select year' />
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
            name='sheet_url'
            type='url'
            placeholder='https://docs.google.com/spreadsheets/d/...'
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Sheet Name (Tab)</Label>
          <Input
            name='sheet_name'
            type='text'
            placeholder='Sheet tab name (optional)'
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
          />
        </div>

        {/* Hidden inputs to submit controlled Select values */}
        <input type='hidden' name='month' value={month} />
        <input type='hidden' name='year' value={year} />
        {/* Provide Supabase access token for secure, cookie-less auth on the server action */}
        <input type='hidden' name='sb_access_token' value={accessToken} />

        <div className='flex justify-end gap-2'>
          <Button variant='outline' asChild>
            <a href='/integrations/google-sheets'>Cancel</a>
          </Button>
          <Button type='submit'>Connect Sheet</Button>
        </div>
      </form>
    </div>
  );
}
