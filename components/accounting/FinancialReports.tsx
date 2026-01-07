"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import type {
  TrialBalance,
  IncomeStatement,
  BalanceSheet,
  AccountingPeriod,
} from "@/types/accounting";
import { cn } from "@/lib/utils";

type ReportType = "trial-balance" | "income-statement" | "balance-sheet";

interface FinancialReportsProps {
  defaultReport?: ReportType;
}

export function FinancialReports({
  defaultReport = "trial-balance",
}: FinancialReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>(defaultReport);
  const [loading, setLoading] = useState(false);
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Report data
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [incomeStatement, setIncomeStatement] =
    useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);

  const { addNotification } = useNotification();

  const fetchPeriods = async () => {
    try {
      const response = await fetch("/api/accounting/periods");
      if (response.ok) {
        const result = await response.json();
        setPeriods(result.data || []);
        // Auto-select current open period
        const openPeriod = (result.data || []).find(
          (p: AccountingPeriod) => !p.isClosed
        );
        if (openPeriod) {
          setSelectedPeriod(openPeriod.id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch periods:", error);
    }
  };

  const fetchReport = async () => {
    if (!selectedPeriod && !dateFrom) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({ reportType: activeReport });
      if (selectedPeriod) params.append("periodId", selectedPeriod);
      if (dateFrom) params.append("startDate", dateFrom.toISOString());
      if (dateTo) params.append("endDate", dateTo.toISOString());

      const response = await fetch(`/api/accounting/reports?${params}`);
      if (!response.ok) throw new Error("Failed to fetch report");

      const result = await response.json();

      switch (activeReport) {
        case "trial-balance":
          setTrialBalance(result.data);
          break;
        case "income-statement":
          setIncomeStatement(result.data);
          break;
        case "balance-sheet":
          setBalanceSheet(result.data);
          break;
      }
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load report",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod || dateFrom) {
      fetchReport();
    }
  }, [activeReport, selectedPeriod, dateFrom, dateTo]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleExport = () => {
    let csvContent = "";
    const filename = `${activeReport}-${format(new Date(), "yyyyMMdd")}.csv`;

    if (activeReport === "trial-balance" && trialBalance) {
      csvContent =
        "Account Code,Account Name,Debit,Credit\n" +
        trialBalance.rows
          .map(
            (row) =>
              `${row.accountCode},${row.accountName},${row.debitBalance.toFixed(
                2
              )},${row.creditBalance.toFixed(2)}`
          )
          .join("\n") +
        `\nTotals,,${trialBalance.totalDebits.toFixed(
          2
        )},${trialBalance.totalCredits.toFixed(2)}`;
    } else if (activeReport === "income-statement" && incomeStatement) {
      csvContent =
        "Section,Account,Amount\n" +
        incomeStatement.revenue.items
          .map(
            (item) => `Revenue,${item.accountName},${item.amount.toFixed(2)}`
          )
          .join("\n") +
        `\nTotal Revenue,,${incomeStatement.revenue.total.toFixed(2)}\n` +
        incomeStatement.expenses.items
          .map(
            (item) => `Expenses,${item.accountName},${item.amount.toFixed(2)}`
          )
          .join("\n") +
        `\nTotal Expenses,,${incomeStatement.expenses.total.toFixed(2)}\n` +
        `\nNet Income,,${incomeStatement.netIncome.toFixed(2)}`;
    } else if (activeReport === "balance-sheet" && balanceSheet) {
      const allAssets = [
        ...balanceSheet.assets.current,
        ...balanceSheet.assets.fixed,
        ...balanceSheet.assets.other,
      ];
      const allLiabilities = [
        ...balanceSheet.liabilities.current,
        ...balanceSheet.liabilities.longTerm,
      ];
      csvContent =
        "Category,Account,Amount\n" +
        allAssets
          .map((item) => `Assets,${item.accountName},${item.amount.toFixed(2)}`)
          .join("\n") +
        `\nTotal Assets,,${balanceSheet.assets.total.toFixed(2)}\n` +
        allLiabilities
          .map(
            (item) =>
              `Liabilities,${item.accountName},${item.amount.toFixed(2)}`
          )
          .join("\n") +
        `\nTotal Liabilities,,${balanceSheet.liabilities.total.toFixed(2)}\n` +
        balanceSheet.equity.items
          .map((item) => `Equity,${item.accountName},${item.amount.toFixed(2)}`)
          .join("\n") +
        `\nTotal Equity,,${balanceSheet.equity.total.toFixed(2)}`;
    }

    if (csvContent) {
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <Card className='print:hidden'>
        <CardContent className='p-4'>
          <div className='flex flex-col md:flex-row gap-4 items-end'>
            <div className='flex-1 space-y-2'>
              <Label>Accounting Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder='Select period' />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} {period.isClosed ? "(Closed)" : "(Open)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='text-muted-foreground'>or</div>
            <div className='flex gap-2'>
              <div className='space-y-2'>
                <Label>From Date</Label>
                <Input
                  type='date'
                  className='w-[150px]'
                  value={dateFrom ? format(dateFrom, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value + "T00:00:00")
                      : undefined;
                    setDateFrom(date);
                  }}
                />
              </div>
              <div className='space-y-2'>
                <Label>To Date</Label>
                <Input
                  type='date'
                  className='w-[150px]'
                  value={dateTo ? format(dateTo, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value + "T00:00:00")
                      : undefined;
                    setDateTo(date);
                  }}
                />
              </div>
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='icon' onClick={handleExport}>
                <Download className='h-4 w-4' />
              </Button>
              <Button variant='outline' size='icon' onClick={handlePrint}>
                <Printer className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs
        value={activeReport}
        onValueChange={(v) => setActiveReport(v as ReportType)}
        className='print:hidden'
      >
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='trial-balance'>Trial Balance</TabsTrigger>
          <TabsTrigger value='income-statement'>Income Statement</TabsTrigger>
          <TabsTrigger value='balance-sheet'>Balance Sheet</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <TableSkeleton rows={10} columns={4} />
      ) : (
        <>
          {/* Trial Balance */}
          {activeReport === "trial-balance" && trialBalance && (
            <Card>
              <CardHeader>
                <CardTitle className='text-center'>Trial Balance</CardTitle>
                <p className='text-center text-sm text-muted-foreground'>
                  As of{" "}
                  {format(new Date(trialBalance.asOfDate), "MMMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className='text-right'>Debit</TableHead>
                      <TableHead className='text-right'>Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trialBalance.rows.map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell className='font-mono'>
                          {row.accountCode}
                        </TableCell>
                        <TableCell>{row.accountName}</TableCell>
                        <TableCell className='text-right font-mono'>
                          {row.debitBalance > 0
                            ? formatCurrency(row.debitBalance)
                            : "-"}
                        </TableCell>
                        <TableCell className='text-right font-mono'>
                          {row.creditBalance > 0
                            ? formatCurrency(row.creditBalance)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className='font-bold border-t-2'>
                      <TableCell colSpan={2}>Totals</TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(trialBalance.totalDebits)}
                      </TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(trialBalance.totalCredits)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {trialBalance.isBalanced ? (
                  <p className='text-center text-green-600 mt-4'>
                    ✓ Trial Balance is in balance
                  </p>
                ) : (
                  <p className='text-center text-red-600 mt-4'>
                    ✗ Trial Balance is out of balance by{" "}
                    {formatCurrency(
                      Math.abs(
                        trialBalance.totalDebits - trialBalance.totalCredits
                      )
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Income Statement */}
          {activeReport === "income-statement" && incomeStatement && (
            <Card>
              <CardHeader>
                <CardTitle className='text-center'>Income Statement</CardTitle>
                <p className='text-center text-sm text-muted-foreground'>
                  For the period ending{" "}
                  {format(new Date(incomeStatement.periodEnd), "MMMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Revenue Section */}
                <div>
                  <h3 className='font-semibold text-lg flex items-center gap-2 mb-2'>
                    <TrendingUp className='h-5 w-5 text-green-600' />
                    Revenue
                  </h3>
                  <Table>
                    <TableBody>
                      {incomeStatement.revenue.items.map((item) => (
                        <TableRow key={item.accountId}>
                          <TableCell className='pl-8'>
                            {item.accountName}
                          </TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className='font-semibold border-t'>
                        <TableCell className='pl-4'>Total Revenue</TableCell>
                        <TableCell className='text-right font-mono text-green-600'>
                          {formatCurrency(incomeStatement.revenue.total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Expenses Section */}
                <div>
                  <h3 className='font-semibold text-lg flex items-center gap-2 mb-2'>
                    <TrendingDown className='h-5 w-5 text-red-600' />
                    Expenses
                  </h3>
                  <Table>
                    <TableBody>
                      {incomeStatement.expenses.items.map((item) => (
                        <TableRow key={item.accountId}>
                          <TableCell className='pl-8'>
                            {item.accountName}
                          </TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className='font-semibold border-t'>
                        <TableCell className='pl-4'>Total Expenses</TableCell>
                        <TableCell className='text-right font-mono text-red-600'>
                          {formatCurrency(incomeStatement.expenses.total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Net Income */}
                <div className='border-t-2 pt-4'>
                  <div className='flex justify-between items-center text-xl font-bold'>
                    <span className='flex items-center gap-2'>
                      <DollarSign className='h-6 w-6' />
                      Net Income
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        incomeStatement.netIncome >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      )}
                    >
                      {formatCurrency(incomeStatement.netIncome)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance Sheet */}
          {activeReport === "balance-sheet" && balanceSheet && (
            <Card>
              <CardHeader>
                <CardTitle className='text-center'>Balance Sheet</CardTitle>
                <p className='text-center text-sm text-muted-foreground'>
                  As of{" "}
                  {format(new Date(balanceSheet.asOfDate), "MMMM d, yyyy")}
                </p>
              </CardHeader>
              <CardContent>
                <div className='grid md:grid-cols-2 gap-8'>
                  {/* Assets */}
                  <div>
                    <h3 className='font-semibold text-lg border-b pb-2 mb-2'>
                      Assets
                    </h3>
                    <Table>
                      <TableBody>
                        {/* Current Assets */}
                        {balanceSheet.assets.current.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className='font-medium text-muted-foreground'
                              >
                                Current Assets
                              </TableCell>
                            </TableRow>
                            {balanceSheet.assets.current.map((item) => (
                              <TableRow key={item.accountId}>
                                <TableCell className='pl-6'>
                                  {item.accountName}
                                </TableCell>
                                <TableCell className='text-right font-mono'>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        {/* Fixed Assets */}
                        {balanceSheet.assets.fixed.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className='font-medium text-muted-foreground'
                              >
                                Fixed Assets
                              </TableCell>
                            </TableRow>
                            {balanceSheet.assets.fixed.map((item) => (
                              <TableRow key={item.accountId}>
                                <TableCell className='pl-6'>
                                  {item.accountName}
                                </TableCell>
                                <TableCell className='text-right font-mono'>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        {/* Other Assets */}
                        {balanceSheet.assets.other.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className='font-medium text-muted-foreground'
                              >
                                Other Assets
                              </TableCell>
                            </TableRow>
                            {balanceSheet.assets.other.map((item) => (
                              <TableRow key={item.accountId}>
                                <TableCell className='pl-6'>
                                  {item.accountName}
                                </TableCell>
                                <TableCell className='text-right font-mono'>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        <TableRow className='font-bold border-t-2'>
                          <TableCell>Total Assets</TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(balanceSheet.assets.total)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {/* Liabilities & Equity */}
                  <div>
                    <h3 className='font-semibold text-lg border-b pb-2 mb-2'>
                      Liabilities
                    </h3>
                    <Table>
                      <TableBody>
                        {/* Current Liabilities */}
                        {balanceSheet.liabilities.current.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className='font-medium text-muted-foreground'
                              >
                                Current Liabilities
                              </TableCell>
                            </TableRow>
                            {balanceSheet.liabilities.current.map((item) => (
                              <TableRow key={item.accountId}>
                                <TableCell className='pl-6'>
                                  {item.accountName}
                                </TableCell>
                                <TableCell className='text-right font-mono'>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        {/* Long-term Liabilities */}
                        {balanceSheet.liabilities.longTerm.length > 0 && (
                          <>
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className='font-medium text-muted-foreground'
                              >
                                Long-term Liabilities
                              </TableCell>
                            </TableRow>
                            {balanceSheet.liabilities.longTerm.map((item) => (
                              <TableRow key={item.accountId}>
                                <TableCell className='pl-6'>
                                  {item.accountName}
                                </TableCell>
                                <TableCell className='text-right font-mono'>
                                  {formatCurrency(item.amount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </>
                        )}
                        <TableRow className='font-semibold border-t'>
                          <TableCell>Total Liabilities</TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(balanceSheet.liabilities.total)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <h3 className='font-semibold text-lg border-b pb-2 mb-2 mt-6'>
                      Equity
                    </h3>
                    <Table>
                      <TableBody>
                        {balanceSheet.equity.items.map((item) => (
                          <TableRow key={item.accountId}>
                            <TableCell className='pl-4'>
                              {item.accountName}
                            </TableCell>
                            <TableCell className='text-right font-mono'>
                              {formatCurrency(item.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {balanceSheet.equity.retainedEarnings !== 0 && (
                          <TableRow>
                            <TableCell className='pl-4'>
                              Retained Earnings
                            </TableCell>
                            <TableCell className='text-right font-mono'>
                              {formatCurrency(
                                balanceSheet.equity.retainedEarnings
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className='font-semibold border-t'>
                          <TableCell>Total Equity</TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(balanceSheet.equity.total)}
                          </TableCell>
                        </TableRow>
                        <TableRow className='font-bold border-t-2'>
                          <TableCell>Total Liabilities & Equity</TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(
                              balanceSheet.liabilities.total +
                                balanceSheet.equity.total
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Balance Check */}
                <div className='mt-6 text-center'>
                  {balanceSheet.isBalanced ? (
                    <p className='text-green-600'>
                      ✓ Balance Sheet is in balance
                    </p>
                  ) : (
                    <p className='text-red-600'>
                      ✗ Balance Sheet is out of balance by{" "}
                      {formatCurrency(
                        Math.abs(
                          balanceSheet.assets.total -
                            (balanceSheet.liabilities.total +
                              balanceSheet.equity.total)
                        )
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
