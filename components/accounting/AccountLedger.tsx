"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import type { AccountLedgerEntry, ChartOfAccount } from "@/types/accounting";

interface AccountLedgerProps {
  accountId: string;
  onBack?: () => void;
}

export function AccountLedger({ accountId, onBack }: AccountLedgerProps) {
  const [account, setAccount] = useState<ChartOfAccount | null>(null);
  const [entries, setEntries] = useState<AccountLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [summary, setSummary] = useState({
    totalDebits: 0,
    totalCredits: 0,
    balance: 0,
    entryCount: 0,
  });

  const { addNotification } = useNotification();

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/accounting/accounts/${accountId}/ledger`
      );
      if (!response.ok) throw new Error("Failed to fetch ledger");

      const result = await response.json();
      setAccount(result.account);
      setEntries(result.entries || []);
      setSummary(result.summary || {});
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load account ledger",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchLedger();
    }
  }, [accountId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.journalEntryNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Date",
      "Entry #",
      "Description",
      "Debit",
      "Credit",
      "Balance",
    ];
    const rows = entries.map((entry) => [
      format(new Date(entry.date), "yyyy-MM-dd"),
      entry.journalEntryNumber,
      entry.description,
      entry.debit.toFixed(2),
      entry.credit.toFixed(2),
      entry.runningBalance.toFixed(2),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-${account?.code}-${format(
      new Date(),
      "yyyyMMdd"
    )}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  return (
    <div className='space-y-6 print:space-y-4'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden'>
        <div className='flex items-center gap-4'>
          {onBack && (
            <Button variant='ghost' size='icon' onClick={onBack}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          )}
          <div>
            <h2 className='text-2xl font-bold'>Account Ledger</h2>
            {account && (
              <p className='text-muted-foreground'>
                {account.code} - {account.name}
              </p>
            )}
          </div>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={handleExport}>
            <Download className='h-4 w-4 mr-2' />
            Export
          </Button>
          <Button variant='outline' size='sm' onClick={handlePrint}>
            <Printer className='h-4 w-4 mr-2' />
            Print
          </Button>
        </div>
      </div>

      {/* Print Header */}
      <div className='hidden print:block'>
        <h1 className='text-xl font-bold text-center'>Account Ledger</h1>
        {account && (
          <p className='text-center'>
            {account.code} - {account.name}
          </p>
        )}
        <p className='text-center text-sm'>
          Generated: {format(new Date(), "PPP")}
        </p>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Total Debits</p>
            <p className='text-xl font-bold text-green-600'>
              {formatCurrency(summary.totalDebits)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Total Credits</p>
            <p className='text-xl font-bold text-red-600'>
              {formatCurrency(summary.totalCredits)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Current Balance</p>
            <p className='text-xl font-bold'>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-sm text-muted-foreground'>Entries</p>
            <p className='text-xl font-bold'>{summary.entryCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className='relative print:hidden'>
        <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
        <Input
          placeholder='Search entries...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='pl-10 max-w-md'
        />
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className='print:pb-2'>
          <CardTitle className='text-lg'>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Entry #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className='text-right'>Debit</TableHead>
                <TableHead className='text-right'>Credit</TableHead>
                <TableHead className='text-right'>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Opening Balance Row */}
              <TableRow className='bg-muted/30'>
                <TableCell colSpan={3} className='font-medium'>
                  Opening Balance
                </TableCell>
                <TableCell className='text-right'>-</TableCell>
                <TableCell className='text-right'>-</TableCell>
                <TableCell className='text-right font-mono font-medium'>
                  {entries.length > 0
                    ? formatCurrency(
                        entries[0].runningBalance -
                          entries[0].debit +
                          entries[0].credit
                      )
                    : formatCurrency(0)}
                </TableCell>
              </TableRow>

              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className='text-center text-muted-foreground'
                  >
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className='font-mono'>
                        {entry.journalEntryNumber}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-[200px]'>
                      <p className='truncate'>{entry.description}</p>
                      {entry.reference && (
                        <p className='text-xs text-muted-foreground truncate'>
                          Ref: {entry.reference}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className='text-right font-mono'>
                      {entry.debit > 0 ? (
                        <span className='text-green-600'>
                          {formatCurrency(entry.debit)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className='text-right font-mono'>
                      {entry.credit > 0 ? (
                        <span className='text-red-600'>
                          {formatCurrency(entry.credit)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className='text-right font-mono font-medium'>
                      {formatCurrency(entry.runningBalance)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Closing Balance Row */}
              <TableRow className='bg-muted/50 font-semibold'>
                <TableCell colSpan={3}>Closing Balance</TableCell>
                <TableCell className='text-right font-mono text-green-600'>
                  {formatCurrency(summary.totalDebits)}
                </TableCell>
                <TableCell className='text-right font-mono text-red-600'>
                  {formatCurrency(summary.totalCredits)}
                </TableCell>
                <TableCell className='text-right font-mono'>
                  {formatCurrency(summary.balance)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Account Info */}
      {account && (
        <Card className='print:hidden'>
          <CardHeader>
            <CardTitle className='text-lg'>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
              <div>
                <p className='text-muted-foreground'>Account Code</p>
                <p className='font-medium'>{account.code}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>Account Name</p>
                <p className='font-medium'>{account.name}</p>
              </div>
              <div>
                <p className='text-muted-foreground'>Category</p>
                <Badge variant='outline'>{account.category}</Badge>
              </div>
              <div>
                <p className='text-muted-foreground'>Normal Balance</p>
                <Badge
                  className={
                    account.normalBalance === "debit"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }
                >
                  {account.normalBalance.toUpperCase()}
                </Badge>
              </div>
            </div>
            {account.description && (
              <div className='mt-4'>
                <p className='text-muted-foreground'>Description</p>
                <p className='text-sm'>{account.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
