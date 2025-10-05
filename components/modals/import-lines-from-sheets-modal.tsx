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

  const disabled =
    !sheetUrl ||
    !sheetName ||
    !month ||
    !year ||
    loading ||
    !["admin", "moderator"].includes(role || "");

  const handleImport = async () => {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
      onImported?.();
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
            <Button onClick={handleImport} disabled={disabled}>
              {loading ? "Importing..." : "Import"}
            </Button>
            <Button
              variant='secondary'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Close
            </Button>
          </div>
          {error && <div className='text-red-600 text-sm'>{error}</div>}
          {result && (
            <pre className='bg-muted p-2 rounded text-xs overflow-auto max-h-48'>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
