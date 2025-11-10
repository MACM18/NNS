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
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/notification-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {};

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

export default function AddConnectionForm(_: Props) {
  const router = useRouter();
  const { addNotification } = useNotification();
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [sheetUrl, setSheetUrl] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [driveLoading, setDriveLoading] = useState(false);
  const [files, setFiles] = useState<
    Array<{ id: string; name: string; webViewLink?: string }>
  >([]);
  const [validationOpen, setValidationOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [pending, setPending] = useState(false);

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

  // Client-side pre-submit validation and API submit (token-only flow)
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!sheetUrl || sheetUrl.trim() === "") {
      setValidationMessage(
        "Please enter the Google Sheet URL before submitting."
      );
      setValidationOpen(true);
      return;
    }
    // Basic check to avoid accidentally submitting the current page URL
    try {
      const parsed = new URL(sheetUrl);
      const path = parsed.pathname || "";
      if (
        parsed.hostname === window.location.hostname &&
        path.startsWith("/dashboard/integrations")
      ) {
        setValidationMessage(
          "It looks like you pasted the integration page URL. Please paste the Google Sheet URL (docs.google.com/spreadsheets/...)."
        );
        setValidationOpen(true);
        return;
      }
    } catch {
      // If URL parsing fails, let server-side validation handle it
    }

    setPending(true);
    try {
      const payload = {
        month: Number(month),
        year: Number(year),
        sheet_url: sheetUrl.trim(),
      };

      const res = await fetch("/api/integrations/google-sheets/connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(
          json?.error || json?.message || "Failed to connect sheet"
        );
      }

      addNotification({
        title: "Sheet connected",
        message: "Google Sheet connection created successfully.",
        type: "success",
        category: "system",
      });
      router.replace("/dashboard/integrations/google-sheets");
    } catch (err: any) {
      addNotification({
        title: "Failed to connect sheet",
        message: String(err?.message || err),
        type: "error",
        category: "system",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='max-w-2xl mx-auto p-4'>
      <form onSubmit={handleSubmit} className='grid gap-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <Label>Month</Label>
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

        <div className='space-y-2'>
          <Label>Google Sheet</Label>
          <div className='flex gap-2'>
            <Input
              className='flex-1'
              name='sheet_url'
              type='url'
              placeholder='https://docs.google.com/spreadsheets/d/...'
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              required
            />
            <Button
              type='button'
              variant='secondary'
              onClick={async () => {
                setPickerOpen(true);
                setDriveLoading(true);
                try {
                  const res = await fetch("/api/google/drive/list");
                  const json = await res.json();
                  if (json?.ok && Array.isArray(json.files)) {
                    setFiles(
                      json.files.map((f: any) => ({
                        id: f.id,
                        name: f.name,
                        webViewLink: f.webViewLink,
                      }))
                    );
                  } else {
                    setFiles([]);
                  }
                } catch {
                  setFiles([]);
                } finally {
                  setDriveLoading(false);
                }
              }}
            >
              Choose from Drive
            </Button>
          </div>
        </div>

        {/* Sheet name (tab) removed — we auto-detect or persist default on sync */}

        {/* Hidden inputs to submit controlled Select values */}
        <input type='hidden' name='month' value={month} />
        <input type='hidden' name='year' value={year} />
        {/* accessToken is sent in Authorization header by the client submit; keep hidden fields for progressive enhancement */}

        <div className='flex justify-end gap-2'>
          <Button variant='outline' asChild>
            <a href='/dashboard/integrations/google-sheets'>Cancel</a>
          </Button>
          <Button type='submit' disabled={pending}>
            {pending ? "Connecting..." : "Connect Sheet"}
          </Button>
        </div>
      </form>

      {/* Drive Picker */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Select a spreadsheet</DialogTitle>
            <DialogDescription>
              Choose a Google Sheet from your Drive.
            </DialogDescription>
          </DialogHeader>
          {driveLoading ? (
            <div className='py-8 text-center text-muted-foreground'>
              Loading...
            </div>
          ) : files.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>
              No spreadsheets found or not connected.
            </div>
          ) : (
            <div className='max-h-80 overflow-auto divide-y'>
              {files.map((f) => (
                <div
                  key={f.id}
                  className='flex items-center justify-between gap-3 py-3'
                >
                  <div className='min-w-0'>
                    <div className='truncate font-medium'>{f.name}</div>
                    {f.webViewLink && (
                      <a
                        className='text-xs text-blue-600 hover:underline'
                        href={f.webViewLink}
                        target='_blank'
                        rel='noreferrer'
                      >
                        Open
                      </a>
                    )}
                  </div>
                  <Button
                    size='sm'
                    onClick={() => {
                      setSheetUrl(
                        `https://docs.google.com/spreadsheets/d/${f.id}`
                      );
                      setPickerOpen(false);
                    }}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setPickerOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation dialog */}
      <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check your input</DialogTitle>
            <DialogDescription>{validationMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setValidationOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
