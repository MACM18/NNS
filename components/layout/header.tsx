"use client";

import type React from "react";

import {
  Bell,
  Plus,
  Search,
  Settings,
  Check,
  Trash2,
  X,
  Filter,
  Phone,
  Package,
  FileText,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotification } from "@/contexts/notification-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef, useCallback } from "react";
import { AddTelephoneLineModal } from "../modals/add-telephone-line-modal";
import { AddTaskModal } from "../modals/add-task-modal";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useDataCache } from "@/contexts/data-cache-context";
import type { TaskRecord } from "@/types/tasks";

interface SearchResult {
  id: string;
  type: "line" | "task" | "invoice" | "inventory";
  title: string;
  subtitle: string;
  data: any;
}

export function Header() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
  } = useNotification();
  const [openAddTaskModal, setOpenAddTaskModal] = useState(false);
  const [openAddTelephoneLineModal, setOpenAddTelephoneLineModal] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { user } = useAuth();
  const { cache, updateCache } = useDataCache();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const performQuickSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !user) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setIsSearching(true);
      setShowSearchResults(true);

      try {
        const results: SearchResult[] = [];

        const { data: lines } = await supabase
          .from("line_details")
          .select("id, telephone_no, name, address")
          .or(
            `telephone_no.ilike.%${query}%,name.ilike.%${query}%,address.ilike.%${query}%`
          )
          .limit(3);

        if (lines) {
          (lines as Array<Record<string, any>>).forEach((line) => {
            const telephone = line.telephone_no
              ? String(line.telephone_no)
              : "";
            const name = line.name ? String(line.name) : "";
            const address = line.address ? String(line.address) : "";

            results.push({
              id: String(line.id),
              type: "line",
              title: telephone || name || "Line",
              subtitle:
                [telephone, name, address].filter(Boolean).join(" • ") ||
                "No details",
              data: line,
            });
          });
        }

        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, customer_name, telephone_no, address, status, dp, notes")
          .or(
            `customer_name.ilike.%${query}%,telephone_no.ilike.%${query}%,address.ilike.%${query}%,dp.ilike.%${query}%,notes.ilike.%${query}%`
          )
          .limit(3);

        if (tasks) {
          (tasks as Array<Record<string, any>>).forEach((task) => {
            const customer = task.customer_name
              ? String(task.customer_name)
              : "";
            const telephone = task.telephone_no
              ? String(task.telephone_no)
              : "";
            const address = task.address ? String(task.address) : "";
            const status = task.status ? String(task.status) : "";

            results.push({
              id: String(task.id),
              type: "task",
              title: customer || telephone || "Task",
              subtitle:
                [telephone, address, status ? `Status: ${status}` : null]
                  .filter(Boolean)
                  .join(" • ") || "No details",
              data: task,
            });
          });
        }

        const { data: invoices } = await supabase
          .from("generated_invoices")
          .select("id, invoice_number, customer_name, total_amount")
          .ilike("invoice_number", `%${query}%`)
          .limit(3);

        if (invoices) {
          (invoices as Array<Record<string, any>>).forEach((invoice) => {
            const invoiceNumber = invoice.invoice_number
              ? String(invoice.invoice_number)
              : "";
            const customer = invoice.customer_name
              ? String(invoice.customer_name)
              : "";
            const rawAmount = invoice.total_amount as
              | number
              | string
              | null
              | undefined;
            const amount = rawAmount != null ? Number(rawAmount) : null;

            results.push({
              id: String(invoice.id),
              type: "invoice",
              title: invoiceNumber || "Invoice",
              subtitle: customer
                ? `${customer}${
                    amount != null && Number.isFinite(amount)
                      ? ` • LKR ${amount.toLocaleString()}`
                      : ""
                  }`
                : amount != null && Number.isFinite(amount)
                ? `LKR ${amount.toLocaleString()}`
                : "",
              data: invoice,
            });
          });
        }

        const { data: inventory } = await supabase
          .from("inventory_items")
          .select("id, name, current_stock, unit")
          .ilike("name", `%${query}%`)
          .limit(3);

        if (inventory) {
          (inventory as Array<Record<string, any>>).forEach((item) => {
            const name = item.name ? String(item.name) : "";
            const rawStock = item.current_stock as
              | number
              | string
              | null
              | undefined;
            const stock = rawStock != null ? Number(rawStock) : null;
            const unit = item.unit ? String(item.unit) : "";

            results.push({
              id: String(item.id),
              type: "inventory",
              title: name || "Inventory Item",
              subtitle:
                stock != null && Number.isFinite(stock)
                  ? `Stock: ${stock}${unit ? ` ${unit}` : ""}`
                  : "",
              data: item,
            });
          });
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Quick search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [supabase, user]
  );

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length > 2) {
        performQuickSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, performQuickSearch]);

  const handleTaskAdded = (task: TaskRecord) => {
    setOpenAddTaskModal(false);
    const existingTasks = (cache.tasks.data as TaskRecord[]) || [];
    const tasksMap = new Map<string, TaskRecord>();
    [task, ...existingTasks].forEach((item) => tasksMap.set(item.id, item));
    updateCache("tasks", { data: Array.from(tasksMap.values()) });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearchResults(false);
      setSearchQuery("");
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery("");
    router.push(`/search/details/${result.type}/${result.id}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const openAdvancedSearch = () => {
    router.push("/search");
    setShowSearchResults(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "line":
        return <Phone className='h-4 w-4' />;
      case "task":
        return <CheckCircle className='h-4 w-4' />;
      case "invoice":
        return <FileText className='h-4 w-4' />;
      case "inventory":
        return <Package className='h-4 w-4' />;
      default:
        return <Search className='h-4 w-4' />;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case "line":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "task":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "invoice":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "inventory":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
    }
  };

  const getNotificationIcon = (category: string) => {
    switch (category) {
      case "line_added":
        return "📞";
      case "task_completed":
        return "✅";
      case "invoice_generated":
        return "💰";
      case "report_ready":
        return "📊";
      case "inventory_low":
        return "⚠️";
      case "system":
        return "🔧";
      default:
        return "📢";
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return "text-muted-foreground";

    switch (type) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
      <SidebarTrigger className='-ml-1' />
      <Separator orientation='vertical' className='mr-2 h-4' />

      <div className='flex-1 max-w-md relative' ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search lines, tasks, invoices...'
            className='pl-8 pr-24'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          <div className='absolute right-1 top-1 flex gap-1'>
            {searchQuery && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                onClick={clearSearch}
              >
                <X className='h-4 w-4' />
              </Button>
            )}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={openAdvancedSearch}
            >
              <Filter className='h-4 w-4' />
            </Button>
            <Button type='submit' size='sm' className='h-8'>
              Search
            </Button>
          </div>
        </form>

        {showSearchResults && (
          <div className='absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-96 overflow-hidden'>
            {isSearching ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <ScrollArea className='max-h-96'>
                <div className='p-2'>
                  <div className='text-xs font-medium text-muted-foreground mb-2 px-2 flex items-center justify-between'>
                    <span>Quick Results ({searchResults.length})</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 px-2'
                      onClick={openAdvancedSearch}
                    >
                      <Filter className='h-3 w-3 mr-1' />
                      Advanced
                    </Button>
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className='flex items-center gap-3 p-2 hover:bg-muted rounded-md cursor-pointer'
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className='flex-shrink-0'>
                        {getResultIcon(result.type)}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-sm truncate'>
                            {result.title}
                          </span>
                          <Badge
                            className={cn(
                              "text-xs",
                              getResultBadgeColor(result.type)
                            )}
                          >
                            {result.type}
                          </Badge>
                        </div>
                        <p className='text-xs text-muted-foreground truncate'>
                          {result.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className='border-t mt-2 pt-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='w-full text-xs'
                      onClick={openAdvancedSearch}
                    >
                      <Filter className='h-3 w-3 mr-1' />
                      View all results with advanced filters
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : searchQuery ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                <div>No quick results found for “{searchQuery}”.</div>
                <Button
                  variant='ghost'
                  size='sm'
                  className='mt-2 text-xs'
                  onClick={openAdvancedSearch}
                >
                  <Filter className='h-3 w-3 mr-1' />
                  Try advanced search
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className='flex items-center gap-2'>
        <Button onClick={() => setOpenAddTaskModal(true)} size='sm'>
          <Plus className='h-4 w-4 mr-2' />
          Add Task
        </Button>

        <Button onClick={() => setOpenAddTelephoneLineModal(true)} size='sm'>
          <Plus className='h-4 w-4 mr-2' />
          Add Line
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='relative'>
              <Bell className='h-4 w-4' />
              {unreadCount > 0 && (
                <Badge
                  variant='destructive'
                  className='absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center'
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-96'>
            <DropdownMenuLabel className='flex items-center justify-between'>
              <span>Notifications</span>
              <div className='flex gap-1'>
                {unreadCount > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={markAllAsRead}
                    className='h-6 px-2'
                  >
                    <Check className='h-3 w-3 mr-1' />
                    Mark all read
                  </Button>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isLoading ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                No notifications yet
              </div>
            ) : (
              <ScrollArea className='h-96'>
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 last:border-0",
                      !notification.is_read && "bg-muted/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className='text-lg mt-0.5'>
                      {getNotificationIcon(notification.category)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1'>
                          <p
                            className={cn(
                              "font-medium text-sm leading-tight",
                              getNotificationColor(
                                notification.type,
                                notification.is_read
                              )
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                            {notification.message}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                        <div className='flex items-center gap-1'>
                          {!notification.is_read && (
                            <div className='w-2 h-2 bg-blue-500 rounded-full' />
                          )}
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100'
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {notifications.length > 10 && (
                  <div className='p-3 text-center'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => router.push("/notifications")}
                    >
                      View all notifications
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant='ghost'
          size='sm'
          onClick={() => router.push("/settings")}
        >
          <Settings className='h-4 w-4' />
        </Button>

        <ThemeToggle />

        {openAddTaskModal && (
          <AddTaskModal
            open={openAddTaskModal}
            onOpenChange={setOpenAddTaskModal}
            onSuccess={handleTaskAdded}
          />
        )}

        {openAddTelephoneLineModal && (
          <AddTelephoneLineModal
            open={openAddTelephoneLineModal}
            onOpenChange={() => setOpenAddTelephoneLineModal(false)}
            onSuccess={() => setOpenAddTelephoneLineModal(false)}
          />
        )}
      </div>
    </header>
  );
}
