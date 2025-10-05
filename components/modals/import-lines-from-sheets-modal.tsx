"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
};

export function ImportLinesFromSheetsModal({
  open,
  onOpenChange,
  onImported,
}: Props) {
  const { role } = useAuth();
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const disabled =
    !sheetUrl ||
    !sheetName ||
    !month ||
    !year ||
    loading ||
    !["admin", "moderator"].includes(role || "");

  const callImport = async (opts?: { dryRun?: boolean }) => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/import-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl,
          sheetName,
          month: Number(month),
          year: Number(year),
          dryRun: opts?.dryRun ?? dryRun,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      if (!data.dryRun) onImported?.();
    } catch (e: any) {
      setError(e?.message || "Failed to import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Lines from Google Sheets</DialogTitle>
          <DialogDescription>
            Admin/Moderator only. Provide the Google Sheet link and sheet name
            (must contain 'nns'). The sheet must include the exact header row as
            specified.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4'>
          <div>
            <Label htmlFor='sheetUrl'>Google Sheet URL or ID</Label>
            <Input
              id='sheetUrl'
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder='https://docs.google.com/spreadsheets/d/...'
            />
          </div>
          <div>
            <Label htmlFor='sheetName'>Sheet Name (must include 'nns')</Label>
            <Input
              id='sheetName'
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder='e.g., Sept-2025-nns'
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label htmlFor='month'>Month</Label>
              <Input
                id='month'
                type='number'
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor='year'>Year</Label>
              <Input
                id='year'
                type='number'
                min={2000}
                max={3000}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button onClick={() => callImport({ dryRun })} disabled={disabled}>
              {loading
                ? dryRun
                  ? "Previewing..."
                  : "Importing..."
                : dryRun
                ? "Preview (Dry Run)"
                : "Run Import"}
            </Button>
            <Button
              variant='secondary'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Close
            </Button>
          </div>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='dryRun'
              checked={dryRun}
              onCheckedChange={(v) => setDryRun(!!v)}
            />
            <Label htmlFor='dryRun'>Dry Run (preview only)</Label>
          </div>
          {error && <div className='text-red-600 text-sm'>{error}</div>}
          {result && (
            <div className='space-y-2'>
              {result.dryRun && (
                <div className='text-sm'>
                  <div className='font-medium'>Dry-run Preview</div>
                  <div className='text-muted-foreground'>
                    Existing rows to delete: {result.totals?.existing ?? 0}
                  </div>
                  <div className='text-muted-foreground'>
                    New rows to insert: {result.totals?.toInsert ?? 0}
                  </div>
                  <div className='text-muted-foreground'>
                    Distinct phone numbers: {result.totals?.phoneNumbers ?? 0}
                  </div>
                  <div className='mt-2'>
                    <div className='font-medium'>Sample Inserts (first 10)</div>
                    <pre className='bg-muted p-2 rounded text-xs overflow-auto max-h-48'>
                      {JSON.stringify(result.sampleInserts, null, 2)}
                    </pre>
                  </div>
                  <div className='mt-2'>
                    <div className='font-medium'>Existing Rows by Phone</div>
                    <pre className='bg-muted p-2 rounded text-xs overflow-auto max-h-48'>
                      {JSON.stringify(result.existingByPhone, null, 2)}
                    </pre>
                  </div>
                  <div className='mt-3'>
                    <Button
                      onClick={() => callImport({ dryRun: false })}
                      disabled={loading}
                    >
                      Confirm Import
                    </Button>
                  </div>
                </div>
              )}
              {!result.dryRun && (
                <pre className='bg-muted p-2 rounded text-xs overflow-auto max-h-48'>
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
