"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  BookOpen,
  Filter,
} from "lucide-react";
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
import type { ChartOfAccount, AccountCategoryType } from "@/types/accounting";
import { AccountCategory } from "@/types/accounting";

interface AccountsTableProps {
  onViewLedger?: (account: ChartOfAccount) => void;
  refreshTrigger?: number;
}

export function AccountsTable({
  onViewLedger,
  refreshTrigger = 0,
}: AccountsTableProps) {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.values(AccountCategory))
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(
    null
  );
  const { addNotification } = useNotification();

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    category: "Asset" as AccountCategoryType,
    subCategory: "",
    normalBalance: "debit" as "debit" | "credit",
    openingBalance: 0,
  });

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/accounting/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      const result = await response.json();
      setAccounts(result.data || []);
    } catch (error) {
      addNotification({
        title: "Error",
        message: "Failed to load chart of accounts",
        type: "error",
        category: "accounting",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [refreshTrigger]);

  // Group accounts by category
  const groupedAccounts = useMemo(() => {
    let filtered = accounts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = accounts.filter(
        (a) =>
          a.code.toLowerCase().includes(term) ||
          a.name.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((a) => a.category === categoryFilter);
    }

    const grouped: Record<string, ChartOfAccount[]> = {};
    for (const account of filtered) {
      if (!grouped[account.category]) {
        grouped[account.category] = [];
      }
      grouped[account.category].push(account);
    }

    // Sort accounts within each category by code
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => a.code.localeCompare(b.code));
    }

    return grouped;
  }, [accounts, searchTerm, categoryFilter]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Asset":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Liability":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Equity":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "Revenue":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Expense":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getSubCategories = (category: AccountCategoryType): string[] => {
    switch (category) {
      case "Asset":
        return ["Current Asset", "Fixed Asset", "Other Asset"];
      case "Liability":
        return ["Current Liability", "Long-term Liability"];
      case "Equity":
        return ["Owner's Equity", "Retained Earnings"];
      case "Revenue":
        return ["Operating Revenue", "Other Revenue"];
      case "Expense":
        return [
          "Cost of Goods Sold",
          "Operating Expense",
          "Administrative Expense",
          "Other Expense",
        ];
      default:
        return [];
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/accounting/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create account");
      }

      addNotification({
        title: "Success",
        message: "Account created successfully",
        type: "success",
        category: "accounting",
      });
      setAddModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to create account",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/accounting/accounts/${selectedAccount.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            subCategory: formData.subCategory,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update account");
      }

      addNotification({
        title: "Success",
        message: "Account updated successfully",
        type: "success",
        category: "accounting",
      });
      setEditModalOpen(false);
      resetForm();
      fetchAccounts();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to update account",
        type: "error",
        category: "accounting",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/accounting/accounts/${selectedAccount.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete account");
      }

      addNotification({
        title: "Success",
        message: "Account deleted successfully",
        type: "success",
        category: "accounting",
      });
      setDeleteModalOpen(false);
      setSelectedAccount(null);
      fetchAccounts();
    } catch (error) {
      addNotification({
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to delete account",
        type: "error",
        category: "accounting",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category: "Asset",
      subCategory: "",
      normalBalance: "debit",
      openingBalance: 0,
    });
    setSelectedAccount(null);
  };

  const openEditModal = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      description: account.description || "",
      category: account.category,
      subCategory: account.subCategory || "",
      normalBalance: account.normalBalance,
      openingBalance: account.openingBalance,
    });
    setEditModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "LKR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return <TableSkeleton rows={10} columns={6} />;
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
          <CardTitle>Chart of Accounts</CardTitle>
          <Button onClick={() => setAddModalOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Account
          </Button>
        </div>
        <div className='flex flex-col sm:flex-row gap-4 mt-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
            <Input
              placeholder='Search accounts...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className='w-[180px]'>
              <Filter className='mr-2 h-4 w-4' />
              <SelectValue placeholder='All Categories' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              {Object.values(AccountCategory).map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {Object.entries(groupedAccounts).map(
            ([category, categoryAccounts]) => (
              <div key={category} className='border rounded-lg overflow-hidden'>
                <button
                  onClick={() => toggleCategory(category)}
                  className={`w-full flex items-center justify-between p-3 ${getCategoryColor(
                    category
                  )} hover:opacity-90 transition-opacity`}
                >
                  <div className='flex items-center gap-2'>
                    {expandedCategories.has(category) ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronRight className='h-4 w-4' />
                    )}
                    <span className='font-semibold'>{category}</span>
                    <Badge variant='secondary'>{categoryAccounts.length}</Badge>
                  </div>
                  <span className='text-sm'>
                    Total:{" "}
                    {formatCurrency(
                      categoryAccounts.reduce(
                        (sum, a) => sum + a.currentBalance,
                        0
                      )
                    )}
                  </span>
                </button>
                {expandedCategories.has(category) && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[100px]'>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Sub-Category</TableHead>
                        <TableHead className='text-right'>Balance</TableHead>
                        <TableHead className='w-[120px]'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className='font-mono'>
                            {account.code}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-2'>
                              <span>{account.name}</span>
                              {account.isSystemAccount && (
                                <Badge variant='outline' className='text-xs'>
                                  System
                                </Badge>
                              )}
                              {!account.isActive && (
                                <Badge
                                  variant='destructive'
                                  className='text-xs'
                                >
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{account.subCategory || "-"}</TableCell>
                          <TableCell className='text-right font-mono'>
                            {formatCurrency(account.currentBalance)}
                          </TableCell>
                          <TableCell>
                            <div className='flex gap-1'>
                              {onViewLedger && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => onViewLedger(account)}
                                  title='View Ledger'
                                >
                                  <BookOpen className='h-4 w-4' />
                                </Button>
                              )}
                              <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => openEditModal(account)}
                                title='Edit'
                              >
                                <Edit className='h-4 w-4' />
                              </Button>
                              {!account.isSystemAccount && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => {
                                    setSelectedAccount(account);
                                    setDeleteModalOpen(true);
                                  }}
                                  title='Delete'
                                >
                                  <Trash2 className='h-4 w-4 text-destructive' />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )
          )}
        </div>
      </CardContent>

      {/* Add Account Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Create a new account in the chart of accounts.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='code'>Account Code *</Label>
                <Input
                  id='code'
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder='e.g., 1050'
                />
              </div>
              <div>
                <Label htmlFor='category'>Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: AccountCategoryType) => {
                    setFormData({
                      ...formData,
                      category: value,
                      subCategory: "",
                      normalBalance: ["Asset", "Expense"].includes(value)
                        ? "debit"
                        : "credit",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AccountCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor='name'>Account Name *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder='e.g., Bank Account'
              />
            </div>
            <div>
              <Label htmlFor='subCategory'>Sub-Category</Label>
              <Select
                value={formData.subCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, subCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select sub-category' />
                </SelectTrigger>
                <SelectContent>
                  {getSubCategories(formData.category).map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label htmlFor='normalBalance'>Normal Balance</Label>
                <Select
                  value={formData.normalBalance}
                  onValueChange={(value: "debit" | "credit") =>
                    setFormData({ ...formData, normalBalance: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='debit'>Debit</SelectItem>
                    <SelectItem value='credit'>Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor='openingBalance'>Opening Balance</Label>
                <Input
                  id='openingBalance'
                  type='number'
                  value={formData.openingBalance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      openingBalance: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='Account description (optional)'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!formData.code || !formData.name || !formData.category}
            >
              Create Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account details. Code and category cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <Label>Account Code</Label>
                <Input value={formData.code} disabled />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={formData.category} disabled />
              </div>
            </div>
            <div>
              <Label htmlFor='editName'>Account Name *</Label>
              <Input
                id='editName'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor='editSubCategory'>Sub-Category</Label>
              <Select
                value={formData.subCategory}
                onValueChange={(value) =>
                  setFormData({ ...formData, subCategory: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select sub-category' />
                </SelectTrigger>
                <SelectContent>
                  {getSubCategories(formData.category).map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='editDescription'>Description</Label>
              <Textarea
                id='editDescription'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the account &quot;
              {selectedAccount?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
