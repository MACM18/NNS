"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
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
import { useNotification } from "@/contexts/notification-context";
import { cn } from "@/lib/utils";
import type {
  AccountingPeriod,
  Currency,
  AccountingSettings,
} from "@/types/accounting";

export default function AccountingSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Data states
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);

  // Modal states
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [closePeriodId, setClosePeriodId] = useState<string | null>(null);

  // Form states
  const [periodForm, setPeriodForm] = useState({
    name: "",
    startDate: new Date(),
    endDate: new Date(),
  });
  const [currencyForm, setCurrencyForm] = useState({
    code: "",
    name: "",
    symbol: "",
    exchangeRate: 1,
    isDefault: false,
  });

  const { addNotification } = useNotification();

  const checkInitialized = async () => {
    try {
      const response = await fetch("/api/accounting/settings");
      if (response.ok) {
        const result = await response.json();
        setSettings(result.data);
        setIsInitialized(!!result.data);
      }
    } catch (error) {
      console.error("Failed to check initialization:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [periodsRes, currenciesRes, settingsRes] = await Promise.all([
        fetch("/api/accounting/periods"),
        fetch("/api/accounting/currencies"),
        fetch("/api/accounting/settings"),
      ]);

      if (periodsRes.ok) {
        const periodsData = await periodsRes.json();
        setPeriods(periodsData.data || []);
      }

      if (currenciesRes.ok) {
        const currenciesData = await currenciesRes.json();
        setCurrencies(currenciesData.data || []);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData.data);
        setIsInitialized(!!settingsData.data);
      }
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load settings",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkInitialized();
    fetchData();
  }, []);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const response = await fetch("/api/accounting/initialize", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to initialize");
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
        message:
          error instanceof Error ? error.message : "Failed to initialize",
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
        body: JSON.stringify(periodForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create period");
      }

      addNotification({
        title: "Success",
        message: "Accounting period created",
        type: "success",
        category: "accounting",
      });

      setPeriodModalOpen(false);
      setPeriodForm({ name: "", startDate: new Date(), endDate: new Date() });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create period",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleClosePeriod = async (periodId: string) => {
    try {
      const response = await fetch(
        `/api/accounting/periods/${periodId}/close`,
        { method: "POST" }
      );

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
        message:
          error instanceof Error ? error.message : "Failed to close period",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleCreateCurrency = async () => {
    try {
      const response = await fetch("/api/accounting/currencies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currencyForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create currency");
      }

      addNotification({
        title: "Success",
        message: "Currency added",
        type: "success",
        category: "accounting",
      });

      setCurrencyModalOpen(false);
      setCurrencyForm({
        code: "",
        name: "",
        symbol: "",
        exchangeRate: 1,
        isDefault: false,
      });
      fetchData();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create currency",
        type: "error",
        category: "accounting",
      });
    }
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
        message:
          error instanceof Error ? error.message : "Failed to update settings",
        type: "error",
        category: "accounting",
      });
    }
  };

  if (loading) {
    return (
      <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
        <div className='flex items-center justify-center h-64'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
        <Card className='max-w-lg mx-auto'>
          <CardHeader className='text-center'>
            <Settings className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
            <CardTitle>Initialize Accounting</CardTitle>
            <CardDescription>
              Set up your chart of accounts, currencies, and accounting periods
              to get started with the accounting module.
            </CardDescription>
          </CardHeader>
          <CardContent className='text-center'>
            <Button onClick={handleInitialize} disabled={initializing}>
              {initializing ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  Initializing...
                </>
              ) : (
                <>
                  <Check className='h-4 w-4 mr-2' />
                  Initialize Accounting
                </>
              )}
            </Button>
            <p className='text-sm text-muted-foreground mt-4'>
              This will create default accounts, currencies (LKR), and the
              current accounting period.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='flex-1 space-y-4 p-4 md:p-8 pt-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Accounting Settings
          </h2>
          <p className='text-muted-foreground'>
            Manage periods, currencies, and system settings
          </p>
        </div>
      </div>

      <Tabs defaultValue='periods' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='periods'>
            <Calendar className='h-4 w-4 mr-2' />
            Periods
          </TabsTrigger>
          <TabsTrigger value='currencies'>
            <Globe className='h-4 w-4 mr-2' />
            Currencies
          </TabsTrigger>
          <TabsTrigger value='general'>
            <Settings className='h-4 w-4 mr-2' />
            General
          </TabsTrigger>
        </TabsList>

        {/* Periods Tab */}
        <TabsContent value='periods' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div>
                  <CardTitle>Accounting Periods</CardTitle>
                  <CardDescription>
                    Manage fiscal periods for financial reporting
                  </CardDescription>
                </div>
                <Button onClick={() => setPeriodModalOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Period
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center text-muted-foreground'
                      >
                        No periods defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell className='font-medium'>
                          {period.name}
                        </TableCell>
                        <TableCell>
                          {format(new Date(period.startDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(period.endDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {period.isClosed ? (
                            <Badge variant='secondary'>
                              <Lock className='h-3 w-3 mr-1' />
                              Closed
                            </Badge>
                          ) : (
                            <Badge className='bg-green-500'>
                              <Unlock className='h-3 w-3 mr-1' />
                              Open
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!period.isClosed && (
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setClosePeriodId(period.id)}
                            >
                              Close Period
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Currencies Tab */}
        <TabsContent value='currencies' className='space-y-4'>
          <Card>
            <CardHeader>
              <div className='flex justify-between items-center'>
                <div>
                  <CardTitle>Currencies</CardTitle>
                  <CardDescription>
                    Manage supported currencies and exchange rates
                  </CardDescription>
                </div>
                <Button onClick={() => setCurrencyModalOpen(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add Currency
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='text-center text-muted-foreground'
                      >
                        No currencies defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    currencies.map((currency) => (
                      <TableRow key={currency.id}>
                        <TableCell className='font-mono font-medium'>
                          {currency.code}
                        </TableCell>
                        <TableCell>{currency.name}</TableCell>
                        <TableCell>{currency.symbol}</TableCell>
                        <TableCell className='font-mono'>
                          {Number(currency.exchangeRate).toFixed(4)}
                        </TableCell>
                        <TableCell>
                          {currency.isDefault ? (
                            <Badge className='bg-blue-500'>Default</Badge>
                          ) : currency.isActive ? (
                            <Badge variant='outline'>Active</Badge>
                          ) : (
                            <Badge variant='secondary'>Inactive</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value='general' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure accounting system behavior
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Auto-approve Journal Entries</Label>
                  <p className='text-sm text-muted-foreground'>
                    Automatically approve journal entries when created
                  </p>
                </div>
                <Switch
                  checked={settings?.autoApproveEntries || false}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ autoApproveEntries: checked })
                  }
                />
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Require Entry Approval</Label>
                  <p className='text-sm text-muted-foreground'>
                    Require approval before journal entries affect balances
                  </p>
                </div>
                <Switch
                  checked={settings?.requireApproval || false}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ requireApproval: checked })
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label>Default Currency</Label>
                <Select
                  value={settings?.defaultCurrencyId || ""}
                  onValueChange={(value) =>
                    handleUpdateSettings({ defaultCurrencyId: value })
                  }
                >
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder='Select currency' />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={currency.id}>
                        {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label>Fiscal Year Start</Label>
                <Select
                  value={settings?.fiscalYearStart?.toString() || "1"}
                  onValueChange={(value) =>
                    handleUpdateSettings({ fiscalYearStart: parseInt(value) })
                  }
                >
                  <SelectTrigger className='w-[200px]'>
                    <SelectValue placeholder='Select month' />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December",
                    ].map((month, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <AlertCircle className='h-5 w-5 text-yellow-600' />
                Danger Zone
              </CardTitle>
              <CardDescription>These actions are irreversible</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant='destructive' disabled>
                Reset Accounting Data
              </Button>
              <p className='text-sm text-muted-foreground mt-2'>
                This feature is disabled for safety. Contact support if you need
                to reset accounting data.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Period Modal */}
      <Dialog open={periodModalOpen} onOpenChange={setPeriodModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Accounting Period</DialogTitle>
            <DialogDescription>
              Add a new accounting period for financial reporting
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label>Period Name</Label>
              <Input
                value={periodForm.name}
                onChange={(e) =>
                  setPeriodForm({ ...periodForm, name: e.target.value })
                }
                placeholder='e.g., Q1 2024, January 2024'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodForm.startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className='mr-2 h-4 w-4' />
                      {periodForm.startDate
                        ? format(periodForm.startDate, "MMM d, yyyy")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <CalendarComponent
                      mode='single'
                      selected={periodForm.startDate}
                      onSelect={(date) =>
                        setPeriodForm({
                          ...periodForm,
                          startDate: date || new Date(),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className='space-y-2'>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant='outline'
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodForm.endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className='mr-2 h-4 w-4' />
                      {periodForm.endDate
                        ? format(periodForm.endDate, "MMM d, yyyy")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className='w-auto p-0'>
                    <CalendarComponent
                      mode='single'
                      selected={periodForm.endDate}
                      onSelect={(date) =>
                        setPeriodForm({
                          ...periodForm,
                          endDate: date || new Date(),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setPeriodModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePeriod} disabled={!periodForm.name}>
              Create Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Currency Modal */}
      <Dialog open={currencyModalOpen} onOpenChange={setCurrencyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Currency</DialogTitle>
            <DialogDescription>
              Add a new currency for multi-currency accounting
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label>Currency Code</Label>
                <Input
                  value={currencyForm.code}
                  onChange={(e) =>
                    setCurrencyForm({
                      ...currencyForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder='USD'
                  maxLength={3}
                />
              </div>
              <div className='space-y-2'>
                <Label>Symbol</Label>
                <Input
                  value={currencyForm.symbol}
                  onChange={(e) =>
                    setCurrencyForm({ ...currencyForm, symbol: e.target.value })
                  }
                  placeholder='$'
                  maxLength={5}
                />
              </div>
            </div>
            <div className='space-y-2'>
              <Label>Currency Name</Label>
              <Input
                value={currencyForm.name}
                onChange={(e) =>
                  setCurrencyForm({ ...currencyForm, name: e.target.value })
                }
                placeholder='US Dollar'
              />
            </div>
            <div className='space-y-2'>
              <Label>Exchange Rate (to base currency)</Label>
              <Input
                type='number'
                step='0.0001'
                value={currencyForm.exchangeRate}
                onChange={(e) =>
                  setCurrencyForm({
                    ...currencyForm,
                    exchangeRate: parseFloat(e.target.value) || 1,
                  })
                }
              />
              <p className='text-xs text-muted-foreground'>
                Rate relative to the default currency (LKR)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setCurrencyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCurrency}
              disabled={!currencyForm.code || !currencyForm.name}
            >
              Add Currency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Period Confirmation */}
      <Dialog
        open={!!closePeriodId}
        onOpenChange={(open) => !open && setClosePeriodId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Accounting Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this period? This action cannot be
              undone. No new entries can be posted to a closed period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setClosePeriodId(null)}>
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => closePeriodId && handleClosePeriod(closePeriodId)}
            >
              Close Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
