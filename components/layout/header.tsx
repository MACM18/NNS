"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
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
  ClipboardList,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNotification } from "@/contexts/notification-context";
import { useAuth } from "@/contexts/auth-context";
import { useDataCache } from "@/contexts/data-cache-context";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { TaskRecord } from "@/types/tasks";
import { AddTaskModal } from "../modals/add-task-modal";
import { AddTelephoneLineModal } from "../modals/add-telephone-line-modal";

interface SearchResult {
  id: string;
  type: "line" | "task" | "invoice" | "inventory";
  title: string;
  subtitle: string;
  data: Record<string, unknown>;
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
  const { user } = useAuth();
  const { cache, updateCache } = useDataCache();
  const router = useRouter();
  const supabase = getSupabaseClient();

  const [openAddTaskModal, setOpenAddTaskModal] = useState(false);
  const [openAddTelephoneLineModal, setOpenAddTelephoneLineModal] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

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
          (lines as Array<Record<string, unknown>>).forEach((line) => {
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
          (tasks as Array<Record<string, unknown>>).forEach((task) => {
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
          (invoices as Array<Record<string, unknown>>).forEach((invoice) => {
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
          (inventory as Array<Record<string, unknown>>).forEach((item) => {
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
        // eslint-disable-next-line no-console
        console.error("Quick search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [supabase, user]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        performQuickSearch(searchQuery);
      } else {
        setSearchResults([]);
        setIsSearching(false);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [performQuickSearch, searchQuery]);

  const handleTaskAdded = (task: TaskRecord) => {
    setOpenAddTaskModal(false);
    const existingTasks = (cache.tasks?.data as TaskRecord[]) || [];
    const tasksMap = new Map<string, TaskRecord>();
    [task, ...existingTasks].forEach((item) => tasksMap.set(item.id, item));
    updateCache("tasks", { data: Array.from(tasksMap.values()) });
  };

  const createSearchSubmitHandler = useCallback(
    (closeMobileSheet = false) =>
      (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchQuery.trim()) {
          return;
        }

        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        setShowSearchResults(false);
        setSearchQuery("");

        if (closeMobileSheet) {
          setIsMobileSearchOpen(false);
        }
      },
    [router, searchQuery]
  );

  const handleSearchResultClick = (
    result: SearchResult,
    closeMobileSheet = false
  ) => {
    setShowSearchResults(false);
    setSearchQuery("");

    if (closeMobileSheet) {
      setIsMobileSearchOpen(false);
    }

    router.push(`/search/details/${result.type}/${result.id}`);
  };

  const clearSearch = (closeMobileSheet = false) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);

    if (closeMobileSheet) {
      setIsMobileSearchOpen(false);
    }
  };

  const openAdvancedSearch = (closeMobileSheet = false) => {
    router.push("/search");
    setShowSearchResults(false);

    if (closeMobileSheet) {
      setIsMobileSearchOpen(false);
    }
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
    <header className='flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4'>
      <SidebarTrigger className='-ml-1' />
      <Separator orientation='vertical' className='hidden h-5 md:block' />

      <div
        className='hidden max-w-md flex-1 sm:max-w-lg md:block'
        ref={searchRef}
      >
        <form onSubmit={createSearchSubmitHandler()} className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search lines, tasks, invoices...'
            className='pl-8 pr-24'
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onFocus={() => searchQuery && setShowSearchResults(true)}
          />
          <div className='absolute right-1 top-1 flex gap-1'>
            {searchQuery && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 w-8 p-0'
                onClick={() => clearSearch()}
              >
                <X className='h-4 w-4' />
              </Button>
            )}
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={() => openAdvancedSearch()}
            >
              <Filter className='h-4 w-4' />
            </Button>
            <Button type='submit' size='sm' className='h-8'>
              Search
            </Button>
          </div>
        </form>

        {showSearchResults && (
          <div className='absolute top-full left-0 right-0 z-50 mt-1 hidden max-h-96 overflow-hidden rounded-md border bg-background shadow-lg md:block'>
            {isSearching ? (
              <div className='p-4 text-center text-sm text-muted-foreground'>
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <ScrollArea className='max-h-96'>
                <div className='p-2'>
                  <div className='mb-2 flex items-center justify-between px-2 text-xs font-medium text-muted-foreground'>
                    <span>Quick Results ({searchResults.length})</span>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 px-2'
                      onClick={() => openAdvancedSearch()}
                    >
                      <Filter className='mr-1 h-3 w-3' />
                      Advanced
                    </Button>
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={`${result.type}-${result.id}`}
                      className='flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted'
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className='flex-shrink-0'>
                        {getResultIcon(result.type)}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='truncate text-sm font-medium'>
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
                        <p className='truncate text-xs text-muted-foreground'>
                          {result.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className='mt-2 border-t pt-2'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='w-full text-xs'
                      onClick={() => openAdvancedSearch()}
                    >
                      <Filter className='mr-1 h-3 w-3' />
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
                  onClick={() => openAdvancedSearch()}
                >
                  <Filter className='mr-1 h-3 w-3' />
                  Try advanced search
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className='ml-auto flex items-center gap-2'>
        <Sheet open={isMobileSearchOpen} onOpenChange={setIsMobileSearchOpen}>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' className='md:hidden'>
              <Search className='h-5 w-5' />
              <span className='sr-only'>Open search</span>
            </Button>
          </SheetTrigger>
          <SheetContent side='top' className='space-y-4 pb-6'>
            <SheetHeader>
              <SheetTitle>Search</SheetTitle>
              <SheetDescription>
                Find lines, tasks, invoices, or inventory items.
              </SheetDescription>
            </SheetHeader>
            <form
              onSubmit={createSearchSubmitHandler(true)}
              className='flex flex-col gap-3'
            >
              <div className='flex gap-2'>
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder='Search everything...'
                  autoFocus
                />
                <Button type='submit'>Search</Button>
              </div>
              {searchQuery && (
                <Button
                  type='button'
                  variant='ghost'
                  className='justify-start'
                  onClick={() => clearSearch(true)}
                >
                  <X className='mr-2 h-4 w-4' />
                  Clear
                </Button>
              )}
            </form>
            <div className='space-y-2'>
              {isSearching ? (
                <div className='py-6 text-center text-sm text-muted-foreground'>
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <div className='space-y-2'>
                  {searchResults.map((result) => (
                    <Button
                      key={`mobile-${result.type}-${result.id}`}
                      variant='ghost'
                      className='h-auto justify-start gap-3 py-3 text-left'
                      onClick={() => handleSearchResultClick(result, true)}
                    >
                      <div className='rounded-full bg-muted p-2'>
                        {getResultIcon(result.type)}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='truncate text-sm font-medium'>
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
                        <p className='truncate text-xs text-muted-foreground'>
                          {result.subtitle}
                        </p>
                      </div>
                    </Button>
                  ))}
                  <Button
                    variant='outline'
                    className='w-full justify-center'
                    onClick={() => openAdvancedSearch(true)}
                  >
                    <Filter className='mr-2 h-4 w-4' />
                    Open advanced search
                  </Button>
                </div>
              ) : searchQuery ? (
                <div className='space-y-3 rounded-md border p-4 text-sm text-muted-foreground'>
                  <p>
                    No quick results found. Try advanced search for broader
                    filters.
                  </p>
                  <Button
                    variant='outline'
                    onClick={() => openAdvancedSearch(true)}
                  >
                    <Filter className='mr-2 h-4 w-4' /> Open advanced search
                  </Button>
                </div>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Start typing to see quick results.
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className='hidden items-center gap-2 md:flex'>
          <Button onClick={() => setOpenAddTaskModal(true)} size='sm'>
            <Plus className='mr-2 h-4 w-4' />
            Add Task
          </Button>
          <Button onClick={() => setOpenAddTelephoneLineModal(true)} size='sm'>
            <Plus className='mr-2 h-4 w-4' />
            Add Line
          </Button>
        </div>

        <Sheet open={isMobileActionsOpen} onOpenChange={setIsMobileActionsOpen}>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' className='md:hidden'>
              <Plus className='h-5 w-5' />
              <span className='sr-only'>Open quick actions</span>
            </Button>
          </SheetTrigger>
          <SheetContent side='bottom' className='space-y-4 pb-10'>
            <SheetHeader>
              <SheetTitle>Quick actions</SheetTitle>
              <SheetDescription>
                Manage tasks and new line details on the go.
              </SheetDescription>
            </SheetHeader>
            <div className='grid gap-3'>
              <Button
                className='justify-start gap-2'
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setOpenAddTaskModal(true);
                }}
              >
                <Plus className='h-4 w-4' />
                Add Task
              </Button>
              <Button
                variant='secondary'
                className='justify-start gap-2'
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  setOpenAddTelephoneLineModal(true);
                }}
              >
                <Plus className='h-4 w-4' />
                Add Line
              </Button>
              <Button
                variant='ghost'
                className='justify-start gap-2'
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  router.push("/tasks");
                }}
              >
                <ClipboardList className='h-4 w-4' />
                View tasks
              </Button>
              <Button
                variant='ghost'
                className='justify-start gap-2'
                onClick={() => {
                  setIsMobileActionsOpen(false);
                  router.push("/lines");
                }}
              >
                <Phone className='h-4 w-4' />
                View lines
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='relative'>
              <Bell className='h-5 w-5' />
              {unreadCount > 0 && (
                <Badge
                  variant='destructive'
                  className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs'
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-96 max-w-sm'>
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
                    <Check className='mr-1 h-3 w-3' />
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
                      "flex cursor-pointer items-start gap-3 border-b border-border/50 p-3 last:border-0 hover:bg-muted/50",
                      !notification.is_read && "bg-muted/30"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className='mt-0.5 text-lg'>
                      {getNotificationIcon(notification.category)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-start justify-between gap-2'>
                        <div className='flex-1'>
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              getNotificationColor(
                                notification.type,
                                notification.is_read
                              )
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
                            {notification.message}
                          </p>
                          <p className='mt-1 text-xs text-muted-foreground'>
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                        <div className='flex items-center gap-1'>
                          {!notification.is_read && (
                            <div className='h-2 w-2 rounded-full bg-blue-500' />
                          )}
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-6 w-6 p-0 opacity-0 transition-opacity duration-200 hover:opacity-100 focus:opacity-100 group-hover:opacity-100'
                            onClick={(event) => {
                              event.stopPropagation();
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
          size='icon'
          onClick={() => router.push("/settings")}
        >
          <Settings className='h-5 w-5' />
          <span className='sr-only'>Open settings</span>
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
            onOpenChange={setOpenAddTelephoneLineModal}
            onSuccess={() => setOpenAddTelephoneLineModal(false)}
          />
        )}
      </div>
    </header>
  );
}
