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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Building, CreditCard } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
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

  const supabase = getSupabaseClient();
  const { addNotification } = useNotification();

  useEffect(() => {
    if (open) {
      fetchCompanySettings();
    }
  }, [open]);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error
        throw error;
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
        tiers = data.pricing_tiers;
      }

      setFormData({
        company_name:
          typeof data?.company_name === "string" &&
          data.company_name.trim() !== ""
            ? data.company_name
            : "NNS Enterprise",
        address: typeof data?.address === "string" ? data.address : "",
        contact_numbers: Array.isArray(data?.contact_numbers)
          ? data.contact_numbers
          : [""],
        website: typeof data?.website === "string" ? data.website : "",
        registered_number:
          typeof data?.registered_number === "string"
            ? data.registered_number
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
                  (data.bank_details as any).account_title ?? ""
                ),
                account_number: String(
                  (data.bank_details as any).account_number ?? ""
                ),
                branch_code: String(
                  (data.bank_details as any).branch_code ?? ""
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
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      pricing_tiers: prev.pricing_tiers.map((tier, i) =>
        i === index ? { ...tier, [field]: value } : tier
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
        i === index ? value : num
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
        });
        setLoading(false);
        return;
      }

      // Filter out empty contact numbers
      const validContacts = formData.contact_numbers.filter((num) =>
        num.trim()
      );

      const settingsData = {
        company_name: formData.company_name,
        address: formData.address,
        contact_numbers: validContacts,
        website: formData.website,
        registered_number: formData.registered_number,
        pricing_tiers: validTiers,
        bank_details: formData.bank_details,
        updated_at: new Date().toISOString(),
      };

      // Check if settings exist
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from("company_settings")
          .update(settingsData)
          .eq("id", (existing as { id: number }).id);
        if (error) throw error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("company_settings")
          .insert([settingsData]);
        if (error) throw error;
      }

      addNotification({
        title: "Success",
        message: "Company settings updated successfully",
        type: "success",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      addNotification({
        title: "Error",
        message: error.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[95vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Company Settings</DialogTitle>
          <DialogDescription>
            Configure company information, pricing tiers, and bank details for
            invoices.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building className='h-5 w-5' />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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

              <div>
                <Label htmlFor='address'>Address</Label>
                <Textarea
                  id='address'
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder='Complete company address'
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor='website'>Website</Label>
                <Input
                  id='website'
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder='https://www.company.com'
                />
              </div>

              <div>
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
                    Add Number
                  </Button>
                </div>
                <div className='space-y-2 mt-2'>
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
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Tiers (by Cable Length)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {formData.pricing_tiers.map((tier, index) => (
                  <div key={index} className='grid grid-cols-4 gap-4 items-end'>
                    <div>
                      <Label>Min Length (m)</Label>
                      <Input
                        type='number'
                        value={tier.min_length}
                        onChange={(e) =>
                          handlePricingTierChange(
                            index,
                            "min_length",
                            Number.parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div>
                      <Label>Max Length (m)</Label>
                      <Input
                        type='number'
                        value={
                          tier.max_length === 999999 ? "" : tier.max_length
                        }
                        onChange={(e) =>
                          handlePricingTierChange(
                            index,
                            "max_length",
                            e.target.value
                              ? Number.parseInt(e.target.value)
                              : 999999
                          )
                        }
                        placeholder='500+ (leave empty)'
                      />
                    </div>
                    <div>
                      <Label>Rate (LKR)</Label>
                      <Input
                        type='number'
                        value={tier.rate}
                        onChange={(e) =>
                          handlePricingTierChange(
                            index,
                            "rate",
                            Number.parseInt(e.target.value) || 0
                          )
                        }
                      />
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {tier.min_length}–
                      {tier.max_length === 999999 ? "500+" : tier.max_length}m:
                      LKR {tier.rate}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CreditCard className='h-5 w-5' />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <Label htmlFor='bank_name'>Bank Name</Label>
                  <Input
                    id='bank_name'
                    value={formData.bank_details.bank_name}
                    onChange={(e) =>
                      handleBankDetailsChange("bank_name", e.target.value)
                    }
                    placeholder='e.g., Sampath Bank PLC'
                  />
                </div>
                <div>
                  <Label htmlFor='account_title'>Account Title</Label>
                  <Input
                    id='account_title'
                    value={formData.bank_details.account_title}
                    onChange={(e) =>
                      handleBankDetailsChange("account_title", e.target.value)
                    }
                    placeholder='Account holder name'
                  />
                </div>
                <div>
                  <Label htmlFor='account_number'>Account Number</Label>
                  <Input
                    id='account_number'
                    value={formData.bank_details.account_number}
                    onChange={(e) =>
                      handleBankDetailsChange("account_number", e.target.value)
                    }
                    placeholder='Bank account number'
                  />
                </div>
                <div>
                  <Label htmlFor='branch_code'>Branch Code</Label>
                  <Input
                    id='branch_code'
                    value={formData.bank_details.branch_code}
                    onChange={(e) =>
                      handleBankDetailsChange("branch_code", e.target.value)
                    }
                    placeholder='Branch code'
                  />
                </div>
                <div className='md:col-span-2'>
                  <Label htmlFor='iban'>IBAN</Label>
                  <Input
                    id='iban'
                    value={formData.bank_details.iban}
                    onChange={(e) =>
                      handleBankDetailsChange("iban", e.target.value)
                    }
                    placeholder='PK36SCBL0000001123456702'
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
