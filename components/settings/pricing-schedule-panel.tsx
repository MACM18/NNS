"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Lock, Plus, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/contexts/notification-context";
import { OPTIONAL_ITEM_DESCRIPTIONS, OPTIONAL_ITEM_RATES, type OptionalItemCode } from "@/lib/service-pricing-types";

type Tier = { min_length: number; max_length: number | null; rate: number };
type Schedule = { id: string; name: string; effective_from: string; status: string; locked_at: string | null; peo_tv_rate: number; optional_rates: Record<OptionalItemCode, number>; tiers: Tier[]; data_tiers: Tier[] };

const defaultTiers: Tier[] = [
  { min_length: 0, max_length: 100, rate: 6650 },
  { min_length: 101, max_length: 200, rate: 7000 },
  { min_length: 201, max_length: 300, rate: 7800 },
  { min_length: 301, max_length: 400, rate: 8400 },
  { min_length: 401, max_length: 500, rate: 8800 },
  { min_length: 501, max_length: null, rate: 9000 },
];
const defaultDataTiers: Tier[] = [
  { min_length: 0, max_length: 100, rate: 5000 },
  { min_length: 101, max_length: 200, rate: 5500 },
  { min_length: 201, max_length: 300, rate: 6800 },
  { min_length: 301, max_length: 400, rate: 6800 },
  { min_length: 401, max_length: 500, rate: 7200 },
  { min_length: 501, max_length: null, rate: 7400 },
];

export function PricingSchedulePanel({ canManage }: { canManage: boolean }) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [tiers, setTiers] = useState<Tier[]>(defaultTiers);
  const [dataTiers, setDataTiers] = useState<Tier[]>(defaultDataTiers);
  const [peoTvRate, setPeoTvRate] = useState(1800);
  const [optionalRates, setOptionalRates] = useState<Record<OptionalItemCode, number>>({ ...OPTIONAL_ITEM_RATES });
  const { addNotification } = useNotification();

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing-schedules");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to load pricing schedules");
      setSchedules(result.data || []);
    } catch (error) {
      addNotification({ title: "Pricing schedules unavailable", message: error instanceof Error ? error.message : "Try again later", type: "error", category: "system" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = useMemo(() => schedules.find((schedule) => schedule.effective_from <= new Date().toISOString().slice(0, 10)), [schedules]);

  const startNewSchedule = () => {
    if (current) {
      setTiers(current.tiers.map(({ min_length, max_length, rate }) => ({ min_length, max_length, rate })));
      setDataTiers(current.data_tiers.map(({ min_length, max_length, rate }) => ({ min_length, max_length, rate })));
      setPeoTvRate(current.peo_tv_rate);
      setOptionalRates({ ...current.optional_rates });
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextDate = schedules.some((schedule) => schedule.effective_from === today)
      ? new Date(Date.now() + 86400000).toISOString().slice(0, 10)
      : today;
    setEffectiveFrom(nextDate);
    setShowForm(true);
  };

  const updateTier = (service: "FTTH" | "DATA", index: number, field: keyof Tier, value: string) => {
    const update = (currentTiers: Tier[]) => currentTiers.map((tier, tierIndex) => tierIndex === index ? { ...tier, [field]: field === "max_length" && value === "" ? null : Number(value) } : tier);
    if (service === "DATA") setDataTiers(update);
    else setTiers(update);
  };

  const createSchedule = async () => {
    if (!name.trim() || !effectiveFrom) {
      addNotification({ title: "Complete the schedule details", message: "A name and effective date are required.", type: "error", category: "system" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/pricing-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, effective_from: effectiveFrom, tiers, data_tiers: dataTiers, peo_tv_rate: peoTvRate, optional_rates: optionalRates }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create schedule");
      addNotification({ title: "Pricing schedule created", message: "It will apply only to service lines on or after its effective date.", type: "success", category: "system" });
      setShowForm(false);
      setName("");
      setEffectiveFrom("");
      setTiers(defaultTiers);
      setDataTiers(defaultDataTiers);
      setPeoTvRate(1800);
      setOptionalRates({ ...OPTIONAL_ITEM_RATES });
      await load();
    } catch (error) {
      addNotification({ title: "Schedule not created", message: error instanceof Error ? error.message : "Check the tier ranges and try again.", type: "error", category: "system" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'><CalendarClock className='h-5 w-5' />Pricing schedules</CardTitle>
            <CardDescription>Rates are effective-dated. Issued invoices keep their original line rates and customer details.</CardDescription>
          </div>
          {canManage && <Button onClick={showForm ? () => setShowForm(false) : startNewSchedule} variant='outline'><Plus className='mr-2 h-4 w-4' />{showForm ? "Close form" : "Adjust rates"}</Button>}
        </div>
      </CardHeader>
      <CardContent className='space-y-5'>
        {showForm && canManage && (
          <div className='rounded-lg border bg-muted/30 p-4 space-y-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'><Label htmlFor='pricing-name'>Schedule name</Label><Input id='pricing-name' value={name} onChange={(event) => setName(event.target.value)} placeholder='April 2027 service rates' /></div>
              <div className='space-y-2'><Label htmlFor='pricing-effective'>Effective from</Label><Input id='pricing-effective' type='date' value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div>
            </div>
            <div className='space-y-3'>
              <h3 className='font-medium'>FTTH rates</h3>
              {tiers.map((tier, index) => (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr]' key={index}>
                  <div className='space-y-1'><Label>Minimum metres</Label><Input type='number' min='0' value={tier.min_length} onChange={(event) => updateTier("FTTH", index, "min_length", event.target.value)} /></div>
                  <div className='space-y-1'><Label>Maximum metres</Label><Input type='number' min='0' value={tier.max_length ?? ""} onChange={(event) => updateTier("FTTH", index, "max_length", event.target.value)} placeholder='Open ended' /></div>
                  <div className='space-y-1'><Label>Rate (LKR)</Label><Input type='number' min='0' value={tier.rate} onChange={(event) => updateTier("FTTH", index, "rate", event.target.value)} /></div>
                </div>
              ))}
            </div>
            <div className='space-y-3'>
              <h3 className='font-medium'>Data Line rates</h3>
              {dataTiers.map((tier, index) => (
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr]' key={index}>
                  <div className='space-y-1'><Label>Minimum metres</Label><Input type='number' min='0' value={tier.min_length} onChange={(event) => updateTier("DATA", index, "min_length", event.target.value)} /></div>
                  <div className='space-y-1'><Label>Maximum metres</Label><Input type='number' min='0' value={tier.max_length ?? ""} onChange={(event) => updateTier("DATA", index, "max_length", event.target.value)} placeholder='Open ended' /></div>
                  <div className='space-y-1'><Label>Rate (LKR)</Label><Input type='number' min='0' value={tier.rate || ""} onChange={(event) => updateTier("DATA", index, "rate", event.target.value)} placeholder='Enter rate' /></div>
                </div>
              ))}
            </div>
            <div className='space-y-1'><Label htmlFor='peo-tv-rate'>Peo TV rate (LKR)</Label><Input id='peo-tv-rate' type='number' min='0' value={peoTvRate} onChange={(event) => setPeoTvRate(Number(event.target.value))} /></div>
            <div className='space-y-3'>
              <h3 className='font-medium'>Optional invoice item rates</h3>
              <div className='grid gap-3 sm:grid-cols-2'>
                {(Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[]).map((code) => (
                  <div className='space-y-1' key={code}><Label htmlFor={`optional-rate-${code}`}>{OPTIONAL_ITEM_DESCRIPTIONS[code]}</Label><Input id={`optional-rate-${code}`} type='number' min='0' value={optionalRates[code]} onChange={(event) => setOptionalRates((rates) => ({ ...rates, [code]: Number(event.target.value) }))} /></div>
                ))}
              </div>
            </div>
            <div className='flex justify-end gap-2'><Button variant='ghost' onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={createSchedule} disabled={saving}>{saving ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Save className='mr-2 h-4 w-4' />}Save schedule</Button></div>
          </div>
        )}
        {loading ? <div className='text-sm text-muted-foreground'>Loading pricing history…</div> : schedules.length === 0 ? <div className='text-sm text-muted-foreground'>No pricing schedules found.</div> : (
          <div className='space-y-3'>
            {schedules.map((schedule) => {
              const isFuture = schedule.effective_from > new Date().toISOString().slice(0, 10);
              return <div key={schedule.id} className='rounded-lg border p-4'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div><div className='font-medium'>{schedule.name}</div><div className='text-sm text-muted-foreground'>Effective from {new Date(`${schedule.effective_from}T00:00:00`).toLocaleDateString()}</div></div>
                  <div className='flex items-center gap-2'>{isFuture ? <Badge variant='secondary'>Future</Badge> : schedule.id === current?.id ? <Badge>Current</Badge> : <Badge variant='outline'>Historical</Badge>}{schedule.status !== "active" || !isFuture && schedule.id !== current?.id ? <Lock className='h-4 w-4 text-muted-foreground' /> : null}</div>
                </div>
                <div className='mt-3 text-sm font-medium'>FTTH</div>
                <div className='mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>{schedule.tiers.map((tier) => <div key={tier.min_length} className='rounded-md bg-muted/50 px-3 py-2 text-sm'><span>{tier.min_length}–{tier.max_length == null ? "open" : tier.max_length}m</span><span className='float-right font-medium'>LKR {tier.rate.toLocaleString()}</span></div>)}</div>
                <div className='mt-3 text-sm font-medium'>Data Line</div>
                <div className='mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>{schedule.data_tiers.map((tier) => <div key={tier.min_length} className='rounded-md bg-muted/50 px-3 py-2 text-sm'><span>{tier.min_length}–{tier.max_length == null ? "open" : tier.max_length}m</span><span className='float-right font-medium'>LKR {tier.rate.toLocaleString()}</span></div>)}</div>
                <div className='mt-3 text-sm'>Peo TV: <span className='font-medium'>LKR {schedule.peo_tv_rate.toLocaleString()}</span></div>
                <div className='mt-3 text-sm font-medium'>Optional invoice items</div>
                <div className='mt-2 grid gap-2 sm:grid-cols-2'>{(Object.keys(OPTIONAL_ITEM_RATES) as OptionalItemCode[]).map((code) => <div key={code} className='rounded-md bg-muted/50 px-3 py-2 text-sm'>{OPTIONAL_ITEM_DESCRIPTIONS[code]}<span className='float-right font-medium'>LKR {schedule.optional_rates[code].toLocaleString()}</span></div>)}</div>
              </div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
