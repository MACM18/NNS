"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Scale,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNotification } from "@/contexts/notification-context";
import type { AccountingSummary } from "@/types/accounting";
import Link from "next/link";

export function AccountingSummaryDashboard() {
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/accounting/summary");
      if (!response.ok) throw new Error("Failed to fetch summary");

      const result = await response.json();
      setSummary(result.data);
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load accounting summary",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyDetailed = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No accounting data available. Initialize your accounting system to get
            started.
          </p>
          <Link href="/dashboard/accounting/settings">
            <Button className="mt-4">Initialize Accounting</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const receivableCollectionRate =
    summary.totalReceivables > 0
      ? ((summary.totalReceivables - (summary.totalAssets * 0.1)) /
          summary.totalReceivables) *
        100
      : 100;

  const payableRate =
    summary.totalPayables > 0
      ? Math.min((summary.totalAssets / summary.totalPayables) * 100, 100)
      : 100;

  return (
    <div className="space-y-6">
      {/* Main Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalAssets)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cash & receivables
            </p>
          </CardContent>
        </Card>

        {/* Total Liabilities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Liabilities
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalLiabilities)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Payables & obligations
            </p>
          </CardContent>
        </Card>

        {/* Net Income */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Income (MTD)
            </CardTitle>
            {summary.netIncome >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.netIncome >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(summary.netIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenue - Expenses
            </p>
          </CardContent>
        </Card>

        {/* Equity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalEquity)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assets - Liabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalRevenue)}
            </div>
            <Progress value={75} className="mt-2 h-1" />
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expenses (MTD)
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <Progress value={60} className="mt-2 h-1" />
          </CardContent>
        </Card>

        {/* Receivables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accounts Receivable
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalReceivables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Outstanding invoices
            </p>
          </CardContent>
        </Card>

        {/* Payables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Accounts Payable
            </CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalPayables)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unpaid bills
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Pending Entries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Journal Entries
            </CardTitle>
            <Badge variant="secondary">{summary.pendingEntries}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary.pendingEntries > 0
                ? `${summary.pendingEntries} entries awaiting approval`
                : "All entries approved"}
            </p>
            {summary.pendingEntries > 0 && (
              <Link href="/dashboard/accounting/journal">
                <Button variant="link" className="p-0 h-auto mt-2">
                  Review entries →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Unpaid Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unpaid Invoices
            </CardTitle>
            <Badge variant="destructive">{summary.unpaidInvoices}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {summary.unpaidInvoices > 0
                ? `${summary.unpaidInvoices} invoices pending payment`
                : "All invoices paid"}
            </p>
            {summary.unpaidInvoices > 0 && (
              <Link href="/dashboard/accounting/payments">
                <Button variant="link" className="p-0 h-auto mt-2">
                  Record payments →
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Current Period */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Period
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summary.currentPeriod ? (
              <>
                <p className="font-medium">{summary.currentPeriod.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(
                    new Date(summary.currentPeriod.startDate),
                    "MMM d"
                  )}{" "}
                  -{" "}
                  {format(new Date(summary.currentPeriod.endDate), "MMM d, yyyy")}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active period set
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/accounting/journal">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                New Journal Entry
              </Button>
            </Link>
            <Link href="/dashboard/accounting/payments">
              <Button variant="outline" size="sm">
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </Link>
            <Link href="/dashboard/accounting/reports">
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </Link>
            <Link href="/dashboard/accounting/accounts">
              <Button variant="outline" size="sm">
                <Wallet className="h-4 w-4 mr-2" />
                Chart of Accounts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Recent journal entries and transactions will appear here
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
