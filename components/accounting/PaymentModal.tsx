"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, CreditCard, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useNotification } from "@/contexts/notification-context";
import { cn } from "@/lib/utils";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  invoiceType?: "generated" | "inventory";
  invoiceAmount?: number;
  invoiceNumber?: string;
  remainingAmount?: number;
  onSuccess?: () => void;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "card", label: "Credit/Debit Card" },
  { value: "mobile_payment", label: "Mobile Payment" },
  { value: "other", label: "Other" },
];

export function PaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceType,
  invoiceAmount = 0,
  invoiceNumber,
  remainingAmount,
  onSuccess,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<
    Array<{ id: string; code: string; name: string }>
  >([]);
  const [formData, setFormData] = useState({
    amount: remainingAmount || invoiceAmount,
    paymentDate: new Date(),
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
    paymentAccountId: "",
  });

  const { addNotification } = useNotification();

  useEffect(() => {
    // Reset form when modal opens
    if (open) {
      setFormData((prev) => ({
        ...prev,
        amount: remainingAmount || invoiceAmount,
      }));
      fetchAccounts();
    }
  }, [open, remainingAmount, invoiceAmount]);

  const fetchAccounts = async () => {
    try {
      // Fetch cash/bank accounts (asset accounts)
      const response = await fetch(
        "/api/accounting/accounts?isActive=true&category=ASSET"
      );
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const result = await response.json();
      setAccounts(result.data || []);

      // Auto-select first cash/bank account if available
      const cashBankAccounts = (result.data || []).filter(
        (a: { code: string }) =>
          a.code.startsWith("1010") || a.code.startsWith("1020")
      );
      if (cashBankAccounts.length > 0 && !formData.paymentAccountId) {
        setFormData((prev) => ({
          ...prev,
          paymentAccountId: cashBankAccounts[0].id,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleSubmit = async () => {
    if (!invoiceId || !invoiceType) {
      addNotification({
        title: "Error",
        message: "Invoice information is required",
        type: "error",
        category: "accounting",
      });
      return;
    }

    if (formData.amount <= 0) {
      addNotification({
        title: "Error",
        message: "Payment amount must be greater than zero",
        type: "error",
        category: "accounting",
      });
      return;
    }

    if (!formData.paymentAccountId) {
      addNotification({
        title: "Error",
        message: "Please select a payment account",
        type: "error",
        category: "accounting",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        invoiceId,
        invoiceType,
        amount: formData.amount,
        paymentDate: formData.paymentDate.toISOString(),
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        paymentAccountId: formData.paymentAccountId,
      };

      const response = await fetch("/api/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to record payment");
      }

      const result = await response.json();

      addNotification({
        title: "Success",
        message: `Payment of ${formatCurrency(
          formData.amount
        )} recorded successfully`,
        type: "success",
        category: "accounting",
      });

      onOpenChange(false);
      onSuccess?.();

      // Reset form
      setFormData({
        amount: 0,
        paymentDate: new Date(),
        paymentMethod: "bank_transfer",
        reference: "",
        notes: "",
        paymentAccountId: "",
      });
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to record payment",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  const effectiveRemaining = remainingAmount ?? invoiceAmount;
  const isPartialPayment = formData.amount < effectiveRemaining;
  const isOverpayment = formData.amount > effectiveRemaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CreditCard className='h-5 w-5' />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {invoiceNumber
              ? `Record a payment for invoice ${invoiceNumber}`
              : "Record a payment for this invoice"}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          {/* Invoice Summary */}
          <div className='bg-muted/50 rounded-lg p-4 space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Invoice Total:</span>
              <span className='font-medium'>
                {formatCurrency(invoiceAmount)}
              </span>
            </div>
            {remainingAmount !== undefined &&
              remainingAmount !== invoiceAmount && (
                <>
                  <div className='flex justify-between text-sm'>
                    <span className='text-muted-foreground'>Already Paid:</span>
                    <span className='font-medium text-green-600'>
                      {formatCurrency(invoiceAmount - remainingAmount)}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm border-t pt-2'>
                    <span className='text-muted-foreground'>Remaining:</span>
                    <span className='font-semibold'>
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                </>
              )}
          </div>

          {/* Payment Amount */}
          <div className='space-y-2'>
            <Label htmlFor='amount'>Payment Amount *</Label>
            <div className='relative'>
              <DollarSign className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='amount'
                type='number'
                step='0.01'
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                className='pl-10'
              />
            </div>
            {isPartialPayment && (
              <p className='text-sm text-yellow-600'>
                This is a partial payment. Remaining after:{" "}
                {formatCurrency(effectiveRemaining - formData.amount)}
              </p>
            )}
            {isOverpayment && (
              <p className='text-sm text-red-600'>
                Amount exceeds remaining balance by{" "}
                {formatCurrency(formData.amount - effectiveRemaining)}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div className='space-y-2'>
            <Label>Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.paymentDate && "text-muted-foreground"
                  )}
                >
                  <Calendar className='mr-2 h-4 w-4' />
                  {formData.paymentDate
                    ? format(formData.paymentDate, "PPP")
                    : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0'>
                <CalendarComponent
                  mode='single'
                  selected={formData.paymentDate}
                  onSelect={(date) =>
                    setFormData({
                      ...formData,
                      paymentDate: date || new Date(),
                    })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div className='space-y-2'>
            <Label>Payment Method *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Select method' />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Account */}
          <div className='space-y-2'>
            <Label>Payment Account *</Label>
            <Select
              value={formData.paymentAccountId}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentAccountId: value })
              }
            >
              <SelectTrigger>
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
            <p className='text-xs text-muted-foreground'>
              This is the cash/bank account receiving the payment
            </p>
          </div>

          {/* Reference */}
          <div className='space-y-2'>
            <Label htmlFor='reference'>Reference Number</Label>
            <div className='relative'>
              <FileText className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                id='reference'
                value={formData.reference}
                onChange={(e) =>
                  setFormData({ ...formData, reference: e.target.value })
                }
                placeholder='Check #, Transaction ID, etc.'
                className='pl-10'
              />
            </div>
          </div>

          {/* Notes */}
          <div className='space-y-2'>
            <Label htmlFor='notes'>Notes</Label>
            <Textarea
              id='notes'
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder='Additional notes (optional)'
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              formData.amount <= 0 ||
              !formData.paymentAccountId ||
              isOverpayment
            }
          >
            {loading ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
