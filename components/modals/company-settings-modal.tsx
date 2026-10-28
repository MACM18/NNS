"use client";

import type React from "react";

import { useState, useEffect } from "react";
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
import { Plus, Trash2, Building, CreditCard, Globe2, Landmark } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotification } from "@/contexts/notification-context";

interface CompanySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface PricingTier {
  min_length: number;
  max_length: number;
  rate: number;
}

export function CompanySettingsModal({
  open,
  onOpenChange,
  onSuccess,
}: CompanySettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "NNS Enterprise",
    address: "",
    contact_numbers: [""],
    website: "",
    registered_number: "",
    pricing_tiers: [
      { min_length: 0, max_length: 100, rate: 6000 },
      { min_length: 101, max_length: 200, rate: 6500 },
      { min_length: 201, max_length: 300, rate: 7200 },
      { min_length: 301, max_length: 400, rate: 7800 },
      { min_length: 401, max_length: 500, rate: 8200 },
      { min_length: 501, max_length: 999999, rate: 8400 },
    ] as PricingTier[],
    bank_details: {
      bank_name: "",
      account_title: "",
      account_number: "",
      branch_code: "",
      iban: "",
    },
  });

  const { addNotification } = useNotification();

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
    }
  }, [open]);

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch("/api/settings/company");

      if (!response.ok) {
        throw new Error("Failed to fetch company settings");
      }

      const { data } = await response.json();

      if (!data) {
        return; // No settings found, use defaults
      }

      let tiers: PricingTier[] = [];
      if (
        data?.pricing_tiers &&
        typeof data.pricing_tiers === "object" &&
        !Array.isArray(data.pricing_tiers)
      ) {
        tiers = Object.entries(data.pricing_tiers).map(([range, rate]) => {
          if (range === "500+") {
            return { min_length: 501, max_length: 999999, rate: Number(rate) };
          }
          const [min, max] = range.split("-").map(Number);
          return { min_length: min, max_length: max, rate: Number(rate) };
        });
      } else if (Array.isArray(data?.pricing_tiers)) {
        // Coerce array entries to numeric types
        tiers = (data?.pricing_tiers as any[]).map((t: any) => ({
          min_length: Number(t.min_length) || 0,
          max_length:
            t.max_length === 999999 ||
            String(t.max_length) === "" ||
            t.max_length == null
              ? 999999
              : Number(t.max_length) || 999999,
          rate: Number(t.rate) || 0,
        }));
      }

      setFormData({
        company_name:
          typeof data?.company_name === "string" &&
          data.company_name.trim() !== ""
            ? data.company_name
            : "NNS Enterprise",
        address:
          typeof data?.address === "string" ? (data?.address as string) : "",
        contact_numbers: Array.isArray(data?.contact_numbers)
          ? (data?.contact_numbers as string[]).map((n) => String(n))
          : [""],
        website:
          typeof data?.website === "string" ? (data?.website as string) : "",
        registered_number:
          typeof data?.registered_number === "string"
            ? (data?.registered_number as string)
            : "",
        pricing_tiers: tiers,
        bank_details:
          data?.bank_details &&
          typeof data.bank_details === "object" &&
          "bank_name" in data.bank_details &&
          "account_title" in data.bank_details &&
          "account_number" in data.bank_details &&
          "branch_code" in data.bank_details &&
          "iban" in data.bank_details
            ? {
                bank_name: String((data.bank_details as any).bank_name ?? ""),
                account_title: String(
                  (data.bank_details as any).account_title ?? "",
                ),
                account_number: String(
                  (data.bank_details as any).account_number ?? "",
                ),
                branch_code: String(
                  (data.bank_details as any).branch_code ?? "",
                ),
                iban: String((data.bank_details as any).iban ?? ""),
              }
            : formData.bank_details,
      });
    } catch (error) {
      console.error("Error fetching company settings:", error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      bank_details: { ...prev.bank_details, [field]: value },
    }));
  };

  const handlePricingTierChange = (
    index: number,
    field: string,
    value: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      pricing_tiers: prev.pricing_tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier,
      ),
    }));
  };

  const addContactNumber = () => {
    setFormData((prev) => ({
      ...prev,
      contact_numbers: [...prev.contact_numbers, ""],
    }));
  };

  const removeContactNumber = (index: number) => {
    if (formData.contact_numbers.length > 1) {
      setFormData((prev) => ({
        ...prev,
        contact_numbers: prev.contact_numbers.filter((_, i) => i !== index),
      }));
    }
  };

  const updateContactNumber = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contact_numbers: prev.contact_numbers.map((num, i) =>
        i === index ? value : num,
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate pricing tiers
      const validTiers = formData.pricing_tiers.filter((tier) => tier.rate > 0);
      if (validTiers.length === 0) {
        addNotification({
          title: "Validation Error",
          message: "Please add at least one pricing tier",
          type: "error",
          category: "system",
        });
        setLoading(false);
        return;
      }

      // Filter out empty contact numbers
      const validContacts = formData.contact_numbers
        .map((n) => String(n).trim())
        .filter((n) => n !== "");

      const pricing_tiers = (validTiers || []).map((t) => ({
        min_length: Number(t.min_length) || 0,
        max_length:
          t.max_length === 999999 ||
          String(t.max_length) === "" ||
          t.max_length == null
            ? 999999
            : Number(t.max_length) || 999999,
        rate: Number(t.rate) || 0,
      }));

      const settingsData = {
        company_name: String(formData.company_name || "NNS Enterprise"),
        address: String(formData.address || ""),
        contact_numbers: validContacts,
        website: String(formData.website || ""),
        registered_number: String(formData.registered_number || ""),
        pricing_tiers,
        bank_details: {
          bank_name: String(formData.bank_details.bank_name || ""),
          account_title: String(formData.bank_details.account_title || ""),
          account_number: String(formData.bank_details.account_number || ""),
          branch_code: String(formData.bank_details.branch_code || ""),
          iban: String(formData.bank_details.iban || ""),
        },
      };

      // Use PUT to update/create settings
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update settings");
      }

      addNotification({
        title: "Success",
        message: "Company settings updated successfully",
        type: "success",
        category: "system",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
        category: "system",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl gap-0 overflow-x-hidden p-0'>
        <div className="border-b bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-5 py-5 sm:px-6 dark:from-sky-950/30 dark:via-card dark:to-indigo-950/20">
          <DialogHeader className="space-y-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm dark:bg-sky-950 dark:text-sky-300"><Building className="h-5 w-5" /></span>
            <DialogTitle className="text-xl">Company details</DialogTitle>
            <DialogDescription>These details appear on new invoices and are shared across the workspace.</DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4 p-4 sm:p-6'>
          <Tabs defaultValue="company" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/70 p-1">
              <TabsTrigger value="company" className="gap-2 rounded-lg py-2.5"><Building className="h-4 w-4" />Company profile</TabsTrigger>
              <TabsTrigger value="bank" className="gap-2 rounded-lg py-2.5"><Landmark className="h-4 w-4" />Bank details</TabsTrigger>
            </TabsList>
            <TabsContent value="company" className="mt-4 space-y-4">
          {/* Company Information */}
            <div className="space-y-4 rounded-xl border p-4">
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <div>
                  <Label htmlFor='company_name'>Company Name</Label>
                  <Input
                    id='company_name'
                    value={formData.company_name}
                    onChange={(e) =>
                      handleInputChange("company_name", e.target.value)
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor='registered_number'>Registered Number</Label>
                  <Input
                    id='registered_number'
                    value={formData.registered_number}
                    onChange={(e) =>
                      handleInputChange("registered_number", e.target.value)
                    }
                    placeholder='Company registration number'
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor='address'>Business address</Label>
                <Textarea
                  id='address'
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder='Complete company address'
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor='website'>Website</Label>
                <div className="relative"><Globe2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input
                  id='website'
                  className="pl-9"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder='https://www.company.com'
                /></div>
              </div>

              <div className="rounded-lg bg-muted/25 p-3">
                <div className='flex items-center justify-between'>
                  <Label>Contact Numbers</Label>
                  <Button
                    type='button'
                    onClick={addContactNumber}
                    size='sm'
                    variant='outline'
                    className='gap-2'
                  >
                    <Plus className='h-4 w-4' />
                    Add number
                  </Button>
                </div>
                <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                  {Array.isArray(formData.contact_numbers) &&
                    formData.contact_numbers.map((number, index) => (
                      <div key={index} className='flex gap-2'>
                        <Input
                          value={number}
                          onChange={(e) =>
                            updateContactNumber(index, e.target.value)
                          }
                          placeholder='Contact number'
                        />
                        <Button
                          type='button'
                          onClick={() => removeContactNumber(index)}
                          size='sm'
                          variant='outline'
                          disabled={formData.contact_numbers.length === 1}
                        >
                          <Trash2 className='h-4 w-4' /><span className="sr-only">Remove number</span>
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            </TabsContent>

          <TabsContent value="bank" className="mt-4 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-sky-200/70 bg-sky-50/70 p-3 text-sm dark:border-sky-900 dark:bg-sky-950/30"><CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" /><p className="text-muted-foreground">Payment details are printed on invoices. Leave a field blank to omit it.</p></div>
              <div className='grid gap-3 rounded-xl border p-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='company-bank-name'>Bank name</Label>
                <Input id='company-bank-name' value={formData.bank_details.bank_name} onChange={(event) => handleBankDetailsChange("bank_name", event.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='company-bank-title'>Account title</Label>
                <Input id='company-bank-title' value={formData.bank_details.account_title} onChange={(event) => handleBankDetailsChange("account_title", event.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='company-bank-number'>Account number</Label>
                <Input id='company-bank-number' value={formData.bank_details.account_number} onChange={(event) => handleBankDetailsChange("account_number", event.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='company-bank-branch'>Branch</Label>
                <Input id='company-bank-branch' value={formData.bank_details.branch_code} onChange={(event) => handleBankDetailsChange("branch_code", event.target.value)} />
              </div>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='company-bank-iban'>IBAN</Label>
                <Input id='company-bank-iban' value={formData.bank_details.iban} onChange={(event) => handleBankDetailsChange("iban", event.target.value)} />
              </div>
              </div>
          </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-4">
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? "Saving…" : "Save details"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
