"use client";

import { useEffect, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Calendar,
  Globe,
  Settings,
  Plus,
  Check,
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit,
  TrendingUp,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotification } from "@/contexts/notification-context";
import { cn } from "@/lib/utils";
import type {
  AccountingPeriod,
  Currency,
  AccountingSettings,
} from "@/types/accounting";

interface CurrencyInfo {
  name: string;
  symbol: string;
}

export default function AccountingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);

  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [supportedCurrencies, setSupportedCurrencies] = useState<string[]>([]);
  const [currencyInfo, setCurrencyInfo] = useState<Record<string, CurrencyInfo>>({});
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});

  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editCurrencyId, setEditCurrencyId] = useState<string | null>(null);
  const [closePeriodId, setClosePeriodId] = useState<string | null>(null);
  const [deleteCurrencyId, setDeleteCurrencyId] = useState<string | null>(null);
  const [currencySearch, setCurrencySearch] = useState("");

  const [periodForm, setPeriodForm] = useState({
    name: "",
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
    periodType: "monthly" as "monthly" | "quarterly" | "yearly",
  });
  const [currencyForm, setCurrencyForm] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1,
    isBase: false,
  });

  const { addNotification } = useNotification();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodsRes, currenciesRes, settingsRes, ratesRes] = await Promise.all([
        fetch("/api/accounting/periods"),
        fetch("/api/accounting/currencies?activeOnly=false"),
        fetch("/api/accounting/settings"),
        fetch("/api/accounting/exchange-rates?action=supported"),
      ]);

      if (periodsRes.ok) {
        const data = await periodsRes.json();
        setPeriods(data.data || []);
      }
      if (currenciesRes.ok) {
        const data = await currenciesRes.json();
        setCurrencies(data.data || []);
      }
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data.data);
        setIsInitialized(!!data.data);
      }
      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setSupportedCurrencies(data.data || []);
        setCurrencyInfo(data.currencyInfo || {});
      }
    } catch {
      addNotification({
        title: "Error",
        message: "Failed to load settings",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchLiveRates = async () => {
    try {
      setRefreshingRates(true);
      const response = await fetch("/api/accounting/exchange-rates");
      if (response.ok) {
        const data = await response.json();
        setLiveRates(data.data || {});
      }
    } catch {
      console.error("Failed to fetch live rates");
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleRefreshExchangeRates = async () => {
    try {
      setRefreshingRates(true);
      const response = await fetch("/api/accounting/exchange-rates", { method: "POST" });
      if (!response.ok) throw new Error("Failed to update exchange rates");
      const result = await response.json();
      addNotification({
        title: "Success",
        message: result.message || "Exchange rates updated",
        type: "success",
        category: "accounting",
      });
      fetchData();
    } catch {
      addNotification({
        title: "Error",
        message: "Failed to update exchange rates",
        type: "error",
        category: "accounting",
      });
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleInitialize = async () => {
    try {
      setInitializing(true);
      const response = await fetch("/api/accounting/initialize", { method: "POST" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Initialization failed");
      }
      addNotification({
        title: "Success",
        message: "Accounting system initialized successfully",
        type: "success",
        category: "accounting",
      });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Initialization failed",
        type: "error",
        category: "accounting",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      const response = await fetch("/api/accounting/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: periodForm.name,
          periodType: periodForm.periodType,
          startDate: periodForm.startDate.toISOString(),
          endDate: periodForm.endDate.toISOString(),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create period");
      }
      addNotification({
        title: "Success",
        message: "Period created successfully",
        type: "success",
        category: "accounting",
      });
      setPeriodModalOpen(false);
      setPeriodForm({
        name: "",
        startDate: startOfMonth(new Date()),
        endDate: endOfMonth(new Date()),
        periodType: "monthly",
      });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create period",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    try {
      const response = await fetch(`/api/accounting/periods/${periodId}/close`, { method: "POST" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to close period");
      }
      addNotification({
        title: "Success",
        message: "Period closed successfully",
        type: "success",
        category: "accounting",
      });
      setClosePeriodId(null);
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to close period",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleSaveCurrency = async () => {
    try {
      const url = editCurrencyId
        ? `/api/accounting/currencies/${editCurrencyId}`
        : "/api/accounting/currencies";
      const response = await fetch(url, {
        method: editCurrencyId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currencyForm),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save currency");
      }
      addNotification({
        title: "Success",
        message: editCurrencyId ? "Currency updated" : "Currency added",
        type: "success",
        category: "accounting",
      });
      setCurrencyModalOpen(false);
      setEditCurrencyId(null);
      setCurrencyForm({ code: "", name: "", symbol: "", exchangeRate: 1, isBase: false });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to save currency",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    try {
      const response = await fetch(`/api/accounting/currencies/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete currency");
      }
      addNotification({
        title: "Success",
        message: "Currency deleted",
        type: "success",
        category: "accounting",
      });
      setDeleteCurrencyId(null);
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete currency",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleEditCurrency = (currency: Currency) => {
    setCurrencyForm({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchangeRate: currency.exchangeRate,
      isBase: currency.isBase,
    });
    setEditCurrencyId(currency.id);
    setCurrencyModalOpen(true);
  };

  const handleSelectCurrencyCode = (code: string) => {
    const info = currencyInfo[code];
    setCurrencyForm({
      ...currencyForm,
      code,
      name: info?.name || code,
      symbol: info?.symbol || code,
      exchangeRate: liveRates[code] ? 1 / liveRates[code] : 1,
    });
  };

  const handleUpdateSettings = async (updates: Partial<AccountingSettings>) => {
    try {
      const response = await fetch("/api/accounting/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update settings");
      }
      addNotification({
        title: "Success",
        message: "Settings updated",
        type: "success",
        category: "accounting",
      });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update settings",
        type: "error",
        category: "accounting",
      });
    }
  };

  const generatePeriodName = (type: string, date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    switch (type) {
      case "monthly": return format(date, "MMMM yyyy");
      case "quarterly": return `Q${Math.floor(month / 3) + 1} ${year}`;
      case "yearly": return `FY ${year}`;
      default: return "";
    }
  };

  const handlePeriodTypeChange = (type: string) => {
    const now = new Date();
    let startDate: Date, endDate: Date;
    switch (type) {
      case "monthly":
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case "quarterly":
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }
    setPeriodForm({
      ...periodForm,
      periodType: type as "monthly" | "quarterly" | "yearly",
      startDate,
      endDate,
      name: generatePeriodName(type, startDate),
    });
  };

  const filteredCurrencies = supportedCurrencies.filter(
    (code) =>
      code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      currencyInfo[code]?.name?.toLowerCase().includes(currencySearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Card className="max-w-lg mx-auto">
          <CardHeader className="text-center">
            <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Initialize Accounting</CardTitle>
            <CardDescription>
              Set up your chart of accounts, currencies, and accounting periods to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleInitialize} disabled={initializing}>
              {initializing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Initializing...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" />Initialize Accounting</>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              This will create default accounts, currencies (LKR), and the current accounting period.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Accounting Settings</h2>
          <p className="text-muted-foreground">Manage periods, currencies, and system settings</p>
        </div>
      </div>

      <Tabs defaultValue="periods" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="periods" className="gap-2">
            <Calendar className="h-4 w-4" /><span className="hidden sm:inline">Periods</span>
          </TabsTrigger>
          <TabsTrigger value="currencies" className="gap-2">
            <Globe className="h-4 w-4" /><span className="hidden sm:inline">Currencies</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" /><span className="hidden sm:inline">General</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Accounting Periods</CardTitle>
                  <CardDescription>Manage fiscal periods for financial reporting</CardDescription>
                </div>
                <Button onClick={() => {
                  setPeriodForm({
                    name: generatePeriodName("monthly", new Date()),
                    startDate: startOfMonth(new Date()),
                    endDate: endOfMonth(new Date()),
                    periodType: "monthly",
                  });
                  setPeriodModalOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />Add Period
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periods.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No periods defined</TableCell>
                      </TableRow>
                    ) : periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>{format(new Date(period.startDate), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(period.endDate), "MMM d, yyyy")}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{period.periodType || "monthly"}</Badge></TableCell>
                        <TableCell>
                          {period.isClosed ? (
                            <Badge variant="secondary"><Lock className="h-3 w-3 mr-1" />Closed</Badge>
                          ) : (
                            <Badge className="bg-green-500"><Unlock className="h-3 w-3 mr-1" />Open</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!period.isClosed && (
                            <Button variant="outline" size="sm" onClick={() => setClosePeriodId(period.id)}>Close Period</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Currencies</CardTitle>
                  <CardDescription>Manage supported currencies and exchange rates</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleRefreshExchangeRates} disabled={refreshingRates}>
                    {refreshingRates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Update Rates
                  </Button>
                  <Button onClick={() => {
                    fetchLiveRates();
                    setCurrencyForm({ code: "", name: "", symbol: "", exchangeRate: 1, isBase: false });
                    setEditCurrencyId(null);
                    setCurrencyModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />Add Currency
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Exchange Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currencies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">No currencies defined</TableCell>
                      </TableRow>
                    ) : currencies.map((currency) => (
                      <TableRow key={currency.id}>
                        <TableCell className="font-mono font-medium">{currency.code}</TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell>{currency.symbol}</TableCell>
                        <TableCell className="font-mono">
                          {currency.isBase ? <span className="text-muted-foreground">1.0000 (base)</span> : currency.exchangeRate?.toFixed(4) || "1.0000"}
                        </TableCell>
                        <TableCell>
                          {currency.isBase ? (
                            <Badge className="bg-blue-500">Base</Badge>
                          ) : currency.isActive ? (
                            <Badge variant="outline">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditCurrency(currency)}><Edit className="h-4 w-4" /></Button>
                            {!currency.isBase && (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteCurrencyId(currency.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Exchange rates are relative to the base currency (LKR). Click &quot;Update Rates&quot; to fetch the latest rates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure accounting system behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-generate Journal Entries</Label>
                  <p className="text-sm text-muted-foreground">Automatically create journal entries for invoices</p>
                </div>
                <Switch checked={settings?.autoGenerateJournalEntries || false} onCheckedChange={(checked) => handleUpdateSettings({ autoGenerateJournalEntries: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Require Entry Approval</Label>
                  <p className="text-sm text-muted-foreground">Require approval before journal entries affect balances</p>
                </div>
                <Switch checked={settings?.requireApproval || false} onCheckedChange={(checked) => handleUpdateSettings({ requireApproval: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Backdated Entries</Label>
                  <p className="text-sm text-muted-foreground">Allow posting entries to past dates</p>
                </div>
                <Switch checked={settings?.allowBackdatedEntries || false} onCheckedChange={(checked) => handleUpdateSettings({ allowBackdatedEntries: checked })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Base Currency</Label>
                  <Select value={settings?.baseCurrencyId || ""} onValueChange={(value) => handleUpdateSettings({ baseCurrencyId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select base currency" /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>{currency.code} - {currency.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select value={settings?.fiscalYearStart?.toString() || "1"} onValueChange={(value) => handleUpdateSettings({ fiscalYearStart: parseInt(value) })}>
                    <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                    <SelectContent>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((month, idx) => (
                        <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Journal Entry Prefix</Label>
                  <Input value={settings?.entryNumberPrefix || "JE-"} onChange={(e) => handleUpdateSettings({ entryNumberPrefix: e.target.value })} placeholder="JE-" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Number Prefix</Label>
                  <Input value={settings?.paymentNumberPrefix || "PAY-"} onChange={(e) => handleUpdateSettings({ paymentNumberPrefix: e.target.value })} placeholder="PAY-" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-yellow-600" />Danger Zone</CardTitle>
              <CardDescription>These actions are irreversible</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" disabled>Reset Accounting Data</Button>
              <p className="text-sm text-muted-foreground mt-2">This feature is disabled for safety.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={periodModalOpen} onOpenChange={setPeriodModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Accounting Period</DialogTitle>
            <DialogDescription>Add a new accounting period for financial reporting</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Period Type</Label>
              <Select value={periodForm.periodType} onValueChange={handlePeriodTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Period Name</Label>
              <Input value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} placeholder="e.g., January 2026" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodForm.startDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {periodForm.startDate ? format(periodForm.startDate, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={periodForm.startDate} onSelect={(date) => setPeriodForm({ ...periodForm, startDate: date || new Date() })} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !periodForm.endDate && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {periodForm.endDate ? format(periodForm.endDate, "MMM d, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={periodForm.endDate} onSelect={(date) => setPeriodForm({ ...periodForm, endDate: date || new Date() })} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePeriod} disabled={!periodForm.name}>Create Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={currencyModalOpen} onOpenChange={(open) => { setCurrencyModalOpen(open); if (!open) { setEditCurrencyId(null); setCurrencySearch(""); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editCurrencyId ? "Edit Currency" : "Add Currency"}</DialogTitle>
            <DialogDescription>{editCurrencyId ? "Update currency details" : "Select a currency or enter details manually"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editCurrencyId && (
              <div className="space-y-2">
                <Label>Select Currency</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {currencyForm.code || "Select currency..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <div className="p-2">
                      <Input placeholder="Search currencies..." value={currencySearch} onChange={(e) => setCurrencySearch(e.target.value)} className="mb-2" />
                    </div>
                    <ScrollArea className="h-[200px]">
                      <div className="p-2">
                        {filteredCurrencies.slice(0, 50).map((code) => (
                          <button key={code} className={cn("w-full text-left px-2 py-1.5 rounded-sm text-sm hover:bg-accent", currencyForm.code === code && "bg-accent")} onClick={() => { handleSelectCurrencyCode(code); setCurrencySearch(""); }}>
                            <span className="font-mono font-medium">{code}</span>
                            <span className="ml-2 text-muted-foreground">{currencyInfo[code]?.name || ""}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Input value={currencyForm.code} onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} disabled={!!editCurrencyId} />
              </div>
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input value={currencyForm.symbol} onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} placeholder="$" maxLength={5} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency Name</Label>
              <Input value={currencyForm.name} onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} placeholder="US Dollar" />
            </div>
            <div className="space-y-2">
              <Label>Exchange Rate (to base currency)</Label>
              <Input type="number" step="0.0001" value={currencyForm.exchangeRate} onChange={(e) => setCurrencyForm({ ...currencyForm, exchangeRate: parseFloat(e.target.value) || 1 })} />
              <p className="text-xs text-muted-foreground">How much base currency (LKR) per 1 unit of this currency</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCurrencyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCurrency} disabled={!currencyForm.code || !currencyForm.name}>{editCurrencyId ? "Update" : "Add"} Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!closePeriodId} onOpenChange={(open) => !open && setClosePeriodId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Close Accounting Period</DialogTitle>
            <DialogDescription>Are you sure you want to close this period? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosePeriodId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => closePeriodId && handleClosePeriod(closePeriodId)}>Close Period</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCurrencyId} onOpenChange={(open) => !open && setDeleteCurrencyId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Currency</DialogTitle>
            <DialogDescription>Are you sure you want to delete this currency?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCurrencyId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCurrencyId && handleDeleteCurrency(deleteCurrencyId)}>Delete Currency</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
