"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotification } from "@/contexts/notification-context";
import { format } from "date-fns";

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    bankName: "",
    accountNumber: "",
    branchCode: "",
    iban: "",
  });

  const handleCreate = async () => {
    if (!form.code || !form.name) {
      addNotification({
        title: "Validation",
        message: "Code and Name are required",
        type: "error",
        category: "accounting",
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/accounting/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || "Failed to create");
      }
      addNotification({
        title: "Success",
        message: "Bank account created",
        type: "success",
        category: "accounting",
      });
      setDialogOpen(false);
      setForm({
        code: "",
        name: "",
        bankName: "",
        accountNumber: "",
        branchCode: "",
        iban: "",
      });
      await fetchAccounts();
    } catch (e: any) {
      addNotification({
        title: "Error",
        message: e?.message || "Failed to create",
        type: "error",
        category: "accounting",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "/api/accounting/accounts?isActive=true&category=ASSET",
      );
      const json = await res.json();
      setAccounts(json.data || []);

      // load company settings to find active account
      const sres = await fetch("/api/settings/company");
      if (sres.ok) {
        const sj = await sres.json();
        setActiveAccountId(sj.data?.bank_details?.accountId || null);
      }
    } catch (e) {
      addNotification({
        title: "Error",
        message: "Failed to load accounts",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const setActive = async (id: string) => {
    try {
      const settingsRes = await fetch("/api/settings/company");
      if (!settingsRes.ok) throw new Error("Failed to load settings");
      const { data } = await settingsRes.json();
      const bank_details = data?.bank_details || {};
      bank_details.accountId = id;

      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, bank_details }),
      });
      if (!response.ok) throw new Error("Failed to update settings");
      setActiveAccountId(id);
      addNotification({
        title: "Success",
        message: "Active bank account updated",
        type: "success",
        category: "accounting",
      });
    } catch (e: any) {
      addNotification({
        title: "Error",
        message: e?.message || "Failed",
        type: "error",
        category: "accounting",
      });
    }
  };

  return (
    <div className='p-4'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold'>Bank Accounts</h2>
        <div>
          <Button
            onClick={() =>
              window.location.assign("/dashboard/accounting/accounts")
            }
          >
            Manage Chart of Accounts
          </Button>
          <Button className='ml-2' onClick={() => setDialogOpen(true)}>
            Add Bank Account
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Creates a chart of account and stores bank metadata.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 mt-2'>
            <div>
              <Label>Account Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder='1010-001'
              />
            </div>
            <div>
              <Label>Account Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder='Sampath Bank - Current'
              />
            </div>
            <div>
              <Label>Bank Name</Label>
              <Input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder='Sampath Bank'
              />
            </div>
            <div>
              <Label>Account Number</Label>
              <Input
                value={form.accountNumber}
                onChange={(e) =>
                  setForm({ ...form, accountNumber: e.target.value })
                }
                placeholder='00012345678'
              />
            </div>
            <div>
              <Label>Branch Code</Label>
              <Input
                value={form.branchCode}
                onChange={(e) =>
                  setForm({ ...form, branchCode: e.target.value })
                }
                placeholder='BR001'
              />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                placeholder='IBAN (optional)'
              />
            </div>
          </div>

          <DialogFooter>
            <div className='w-full flex justify-end gap-2'>
              <Button variant='ghost' onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                Create
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && accounts.length === 0 && (
        <div>No bank/cash accounts found.</div>
      )}

      {accounts.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className='text-right'>Balance</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.code}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell className='text-right'>{a.currentBalance}</TableCell>
                  <TableCell>{activeAccountId === a.id ? "Yes" : ""}</TableCell>
                  <TableCell>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setActive(a.id)}
                    >
                      Set Active
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
