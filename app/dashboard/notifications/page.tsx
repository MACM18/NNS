"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, ClipboardList, FileText, Package, Phone, Search, Settings2, Trash2, WalletCards } from "lucide-react";
import { useNotification } from "@/contexts/notification-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types/notifications";

type Filter = "all" | "unread";

function CategoryIcon({ category }: { category: Notification["category"] }) {
  const Icon = category === "line_added" ? Phone
    : category === "task_completed" ? ClipboardList
      : category === "invoice_generated" ? WalletCards
        : category === "report_ready" ? FileText
          : category === "inventory_low" ? Package
            : category === "system" ? Settings2 : Bell;
  return <Icon className="h-4 w-4" />;
}

function categoryLabel(category: string) {
  return category.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } = useNotification();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [olderNotifications, setOlderNotifications] = useState<Notification[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(notifications.length >= 100);
  const allNotifications = useMemo(() => {
    const ids = new Set(notifications.map((notification) => notification.id));
    return [...notifications, ...olderNotifications.filter((notification) => !ids.has(notification.id))];
  }, [notifications, olderNotifications]);

  useEffect(() => {
    if (notifications.length >= 100) setHasMore(true);
  }, [notifications.length]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allNotifications.filter((notification) => {
      if (filter === "unread" && notification.is_read) return false;
      if (!normalized) return true;
      return `${notification.title} ${notification.message} ${notification.category}`.toLowerCase().includes(normalized);
    });
  }, [allNotifications, filter, query]);

  const loadOlder = async () => {
    setLoadingOlder(true);
    try {
      const offset = notifications.length + olderNotifications.length;
      const response = await fetch(`/api/notifications?limit=100&offset=${offset}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load older notifications");
      const result = await response.json();
      const rows = (result.data || []) as Notification[];
      setOlderNotifications((current) => [...current, ...rows]);
      setHasMore(Boolean(result.hasMore));
    } catch {
      setHasMore(false);
    } finally {
      setLoadingOlder(false);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.action_url) router.push(notification.action_url);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-sky-50 via-background to-background p-5 dark:from-sky-950/30 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Bell className="h-5 w-5" /></div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your activity</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">A clear record of updates and actions that need your attention.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-8 rounded-full px-3">{unreadCount} unread</Badge>
            <Button variant="outline" size="sm" disabled={!unreadCount} onClick={() => void markAllAsRead()}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border bg-card p-1">
          {(["all", "unread"] as const).map((value) => (
            <Button key={value} size="sm" variant={filter === value ? "secondary" : "ghost"} className="capitalize" onClick={() => setFilter(value)}>
              {value === "all" ? "All activity" : "Unread"}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notifications" className="pl-9" />
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Loading your notifications…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Bell className="h-5 w-5" /></div>
            <h2 className="font-medium">{query || filter === "unread" ? "No matching notifications" : "You’re all caught up"}</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">New activity will appear here, with the latest updates also shown in the notification menu.</p>
          </CardContent></Card>
        ) : filtered.map((notification) => (
          <Card key={notification.id} className={cn("overflow-hidden transition-colors", !notification.is_read && "border-primary/25 bg-primary/[0.025]")}>
            <CardContent className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
              <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", notification.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                <CategoryIcon category={notification.category} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={cn("text-sm font-semibold", notification.is_read && "text-muted-foreground")}>{notification.title}</h2>
                  {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-medium">{categoryLabel(notification.category)}</Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{notification.message}</p>
                <p className="mt-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {notification.action_url && <Button variant="outline" size="sm" onClick={() => void openNotification(notification)}>View</Button>}
                {!notification.is_read && <Button variant="ghost" size="icon" title="Mark as read" aria-label="Mark as read" onClick={() => void markAsRead(notification.id)}><Check className="h-4 w-4" /></Button>}
                <Button variant="ghost" size="icon" title="Delete notification" aria-label="Delete notification" onClick={() => void deleteNotification(notification.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {hasMore && <div className="flex justify-center"><Button variant="outline" onClick={() => void loadOlder()} disabled={loadingOlder}>{loadingOlder ? "Loading…" : "Load older notifications"}</Button></div>}
      <p className="text-center text-xs text-muted-foreground">Read notifications are kept for 90 days. Unread notifications are preserved until you clear them.</p>
    </div>
  );
}
