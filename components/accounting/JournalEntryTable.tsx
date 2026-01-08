"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Eye, RotateCcw, Check, Filter } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNotification } from "@/contexts/notification-context";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import type {
  JournalEntry,
  ChartOfAccount,
  JournalEntryStatusType,
} from "@/types/accounting";
import { JournalEntryStatus } from "@/types/accounting";
import { format } from "date-fns";

interface JournalEntryTableProps {
  onViewEntry?: (entry: JournalEntry) => void;
  refreshTrigger?: number;
}

export function JournalEntryTable({
  onViewEntry,
  refreshTrigger = 0,
}: JournalEntryTableProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [reverseModalOpen, setReverseModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [reverseReason, setReverseReason] = useState("");

  // Form state for new entry
  const [formData, setFormData] = useState({
    date: new Date(),
    description: "",
    reference: "",
    notes: "",
    lines: [
      { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
      { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
    ],
  });

  const { addNotification } = useNotification();

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);
      if (dateFrom) params.append("dateFrom", dateFrom.toISOString());
      if (dateTo) params.append("dateTo", dateTo.toISOString());

      const response = await fetch(`/api/accounting/journal-entries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch entries");

      const result = await response.json();
      setEntries(result.data || []);
      setPagination((prev) => ({
        ...prev,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
      }));
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load journal entries",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounting/accounts?isActive=true");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const result = await response.json();
      setAccounts(result.data || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  }, [
    refreshTrigger,
    pagination.page,
    statusFilter,
    searchTerm,
    dateFrom,
    dateTo,
  ]);

  const getStatusBadge = (status: JournalEntryStatusType) => {
    switch (status) {
      case "approved":
        return <Badge className='bg-green-500'>Approved</Badge>;
      case "pending":
        return <Badge className='bg-yellow-500'>Pending</Badge>;
      case "draft":
        return <Badge variant='secondary'>Draft</Badge>;
      case "reversed":
        return <Badge variant='destructive'>Reversed</Badge>;
      default:
        return <Badge variant='outline'>{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
      ],
    });
  };

  const handleRemoveLine = (index: number) => {
    if (formData.lines.length <= 2) return;
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData({ ...formData, lines: newLines });
  };

  const totalDebit = formData.lines.reduce(
    (sum, l) => sum + (l.debitAmount || 0),
    0
  );
  const totalCredit = formData.lines.reduce(
    (sum, l) => sum + (l.creditAmount || 0),
    0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleCreateEntry = async () => {
    if (!isBalanced) {
      addNotification({
        title: "Error",
        message: "Journal entry must be balanced",
        type: "error",
        category: "accounting",
      });
      return;
    }

    try {
      const response = await fetch("/api/accounting/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create entry");
      }

      addNotification({
        title: "Success",
        message: "Journal entry created successfully",
        type: "success",
        category: "accounting",
      });
      setAddModalOpen(false);
      resetForm();
      fetchEntries();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create entry",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleApprove = async (entry: JournalEntry) => {
    try {
      const response = await fetch(
        `/api/accounting/journal-entries/${entry.id}/approve`,
        { method: "POST" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve entry");
      }

      addNotification({
        title: "Success",
        message: "Journal entry approved",
        type: "success",
        category: "accounting",
      });
      fetchEntries();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to approve entry",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleReverse = async () => {
    if (!selectedEntry) return;

    try {
      const response = await fetch(
        `/api/accounting/journal-entries/${selectedEntry.id}/reverse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reverseReason }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reverse entry");
      }

      addNotification({
        title: "Success",
        message: "Journal entry reversed successfully",
        type: "success",
        category: "accounting",
      });
      setReverseModalOpen(false);
      setReverseReason("");
      fetchEntries();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to reverse entry",
        type: "error",
        category: "accounting",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date(),
      description: "",
      reference: "",
      notes: "",
      lines: [
        { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
        { accountId: "", description: "", debitAmount: 0, creditAmount: 0 },
      ],
    });
  };

  if (loading) {
    return <TableSkeleton rows={10} columns={7} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <CardTitle>Journal Entries</CardTitle>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            New Entry
          </Button>
        </div>
        <div className='flex flex-col sm:flex-row gap-4 mt-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
            <Input
              placeholder='Search entries...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[150px]'>
              <Filter className='mr-2 h-4 w-4' />
              <SelectValue placeholder='Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              {Object.entries(JournalEntryStatus).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {key.charAt(0) + key.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type='date'
            className='w-[150px]'
            value={dateFrom ? format(dateFrom, "yyyy-MM-dd") : ""}
            placeholder='From'
            onChange={(e) => {
              const date = e.target.value
                ? new Date(e.target.value + "T00:00:00")
                : undefined;
              setDateFrom(date);
            }}
          />
          <Input
            type='date'
            className='w-[150px]'
            value={dateTo ? format(dateTo, "yyyy-MM-dd") : ""}
            placeholder='To'
            onChange={(e) => {
              const date = e.target.value
                ? new Date(e.target.value + "T00:00:00")
                : undefined;
              setDateTo(date);
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className='text-right'>Debit</TableHead>
              <TableHead className='text-right'>Credit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className='text-center text-muted-foreground'
                >
                  No journal entries found
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className='font-mono'>
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className='max-w-[200px] truncate'>
                    {entry.description}
                  </TableCell>
                  <TableCell>{entry.reference || "-"}</TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatCurrency(entry.totalDebit)}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatCurrency(entry.totalCredit)}
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      {getStatusBadge(entry.status)}
                      {entry.isReversed && (
                        <Badge variant='outline' className='text-xs'>
                          Reversed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => {
                          setSelectedEntry(entry);
                          setViewModalOpen(true);
                        }}
                        title='View Details'
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      {(entry.status === "pending" ||
                        entry.status === "draft") && (
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => handleApprove(entry)}
                          title='Approve'
                        >
                          <Check className='h-4 w-4 text-green-600' />
                        </Button>
                      )}
                      {entry.status === "approved" && !entry.isReversed && (
                        <Button
                          variant='ghost'
                          size='icon'
                          onClick={() => {
                            setSelectedEntry(entry);
                            setReverseModalOpen(true);
                          }}
                          title='Reverse'
                        >
                          <RotateCcw className='h-4 w-4 text-orange-600' />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className='flex justify-between items-center mt-4'>
            <span className='text-sm text-muted-foreground'>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total} entries
            </span>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page - 1 }))
                }
              >
                Previous
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((p) => ({ ...p, page: p.page + 1 }))
                }
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Entry Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Create Journal Entry</DialogTitle>
            <DialogDescription>
              Create a new journal entry. Debits must equal credits.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label>Date *</Label>
                <Input
                  type='date'
                  value={
                    formData.date ? format(formData.date, "yyyy-MM-dd") : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value + "T00:00:00")
                      : new Date();
                    setFormData({ ...formData, date });
                  }}
                />
              </div>
              <div>
                <Label htmlFor='reference'>Reference</Label>
                <Input
                  id='reference'
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  placeholder='Invoice #, etc.'
                />
              </div>
            </div>
            <div>
              <Label htmlFor='description'>Description *</Label>
              <Input
                id='description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='Entry description'
              />
            </div>

            {/* Entry Lines */}
            <div className='space-y-2'>
              <div className='flex justify-between items-center'>
                <Label>Entry Lines</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddLine}
                >
                  <Plus className='h-4 w-4 mr-1' />
                  Add Line
                </Button>
              </div>
              <div className='border rounded-lg overflow-hidden'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className='text-right'>Debit</TableHead>
                      <TableHead className='text-right'>Credit</TableHead>
                      <TableHead className='w-[50px]'></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.lines.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select
                            value={line.accountId}
                            onValueChange={(value) =>
                              handleLineChange(index, "accountId", value)
                            }
                          >
                            <SelectTrigger className='w-[200px]'>
                              <SelectValue placeholder='Select account' />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) =>
                              handleLineChange(
                                index,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder='Line description'
                            className='w-[150px]'
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            value={line.debitAmount || ""}
                            onChange={(e) =>
                              handleLineChange(
                                index,
                                "debitAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-[100px] text-right'
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            value={line.creditAmount || ""}
                            onChange={(e) =>
                              handleLineChange(
                                index,
                                "creditAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className='w-[100px] text-right'
                          />
                        </TableCell>
                        <TableCell>
                          {formData.lines.length > 2 && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => handleRemoveLine(index)}
                            >
                              ×
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className='bg-muted/50'>
                      <TableCell
                        colSpan={2}
                        className='font-semibold text-right'
                      >
                        Totals:
                      </TableCell>
                      <TableCell className='text-right font-mono font-semibold'>
                        {formatCurrency(totalDebit)}
                      </TableCell>
                      <TableCell className='text-right font-mono font-semibold'>
                        {formatCurrency(totalCredit)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {!isBalanced && totalDebit > 0 && totalCredit > 0 && (
                <p className='text-sm text-destructive'>
                  Entry is not balanced. Difference:{" "}
                  {formatCurrency(Math.abs(totalDebit - totalCredit))}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor='notes'>Notes</Label>
              <Textarea
                id='notes'
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder='Additional notes (optional)'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEntry}
              disabled={
                !formData.description || !isBalanced || totalDebit === 0
              }
            >
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Entry Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className='sm:max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>Journal Entry Details</DialogTitle>
            <DialogDescription>
              Entry #{selectedEntry?.entryNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <div className='space-y-4 py-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>Date</Label>
                  <p>{format(new Date(selectedEntry.date), "PPP")}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Status</Label>
                  <div>{getStatusBadge(selectedEntry.status)}</div>
                </div>
              </div>
              <div>
                <Label className='text-muted-foreground'>Description</Label>
                <p>{selectedEntry.description}</p>
              </div>
              {selectedEntry.reference && (
                <div>
                  <Label className='text-muted-foreground'>Reference</Label>
                  <p>{selectedEntry.reference}</p>
                </div>
              )}
              <div>
                <Label className='text-muted-foreground'>Entry Lines</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead className='text-right'>Debit</TableHead>
                      <TableHead className='text-right'>Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntry.lines?.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          {line.account?.code} - {line.account?.name}
                        </TableCell>
                        <TableCell className='text-right font-mono'>
                          {line.debitAmount > 0
                            ? formatCurrency(line.debitAmount)
                            : "-"}
                        </TableCell>
                        <TableCell className='text-right font-mono'>
                          {line.creditAmount > 0
                            ? formatCurrency(line.creditAmount)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className='font-semibold'>
                      <TableCell>Total</TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(selectedEntry.totalDebit)}
                      </TableCell>
                      <TableCell className='text-right font-mono'>
                        {formatCurrency(selectedEntry.totalCredit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {selectedEntry.notes && (
                <div>
                  <Label className='text-muted-foreground'>Notes</Label>
                  <p className='text-sm'>{selectedEntry.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Entry Modal */}
      <Dialog open={reverseModalOpen} onOpenChange={setReverseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reverse Journal Entry</DialogTitle>
            <DialogDescription>
              This will create a new entry that reverses entry #
              {selectedEntry?.entryNumber}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className='py-4'>
            <Label htmlFor='reverseReason'>Reason for Reversal</Label>
            <Textarea
              id='reverseReason'
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder='Enter reason for reversal'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setReverseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleReverse}>
              Reverse Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
