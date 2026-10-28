"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type { Notification, NotificationContextType } from "@/types/notifications";

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  const announcedIds = useRef(new Set<string>());

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load notifications.");
      const result = await response.json();
      const list = (result.data || []) as Notification[];
      list.forEach((notification) => announcedIds.current.add(notification.id));
      setNotifications(list);
      setUnreadCount(Number(result.unreadCount) || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
      setInitialLoaded(true);
    }
  }, [userId]);

  useEffect(() => {
    announcedIds.current.clear();
    setNotifications([]);
    setUnreadCount(0);
    setInitialLoaded(false);
    if (userId) void fetchNotifications();
  }, [fetchNotifications, userId]);

  const addNotification = async (notification: Omit<Notification, "id" | "user_id" | "is_read" | "created_at" | "updated_at">) => {
    if (!userId) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notification),
      });
      if (!response.ok) throw new Error("Could not save notification.");
      const { data } = await response.json();
      announcedIds.current.add(data.id);
      setNotifications((previous) => [data as Notification, ...previous.filter((item) => item.id !== data.id)].slice(0, 100));
      setUnreadCount((count) => count + 1);
      toast(notification.title, { description: notification.message });
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  const markAsRead = async (id: string) => {
    const existing = notifications.find((notification) => notification.id === id);
    if (!existing || existing.is_read) return;
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (!response.ok) throw new Error("Could not update notification.");
      setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, is_read: true } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      toast.error("Could not update notification");
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const response = await fetch("/api/notifications?action=markAllRead", { method: "PUT" });
      if (!response.ok) throw new Error("Could not update notifications.");
      setNotifications((previous) => previous.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      toast.error("Could not update notifications");
    }
  };

  const deleteNotification = async (id: string) => {
    const existing = notifications.find((notification) => notification.id === id);
    try {
      const response = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete notification.");
      setNotifications((previous) => previous.filter((item) => item.id !== id));
      if (existing && !existing.is_read) setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      toast.error("Could not delete notification");
    }
  };

  const deleteAllNotifications = async () => {
    if (!userId) return;
    try {
      const response = await fetch("/api/notifications?action=deleteAll", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete notifications.");
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Notifications cleared");
    } catch {
      toast.error("Could not clear notifications");
    }
  };

  useEffect(() => {
    if (!userId || !initialLoaded) return;
    const since = notifications[0]?.created_at || new Date().toISOString();
    const source = new EventSource(`/api/notifications/sse?since=${encodeURIComponent(since)}`);
    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as Notification;
        if (announcedIds.current.has(notification.id)) return;
        announcedIds.current.add(notification.id);
        setNotifications((previous) => [notification, ...previous].slice(0, 100));
        setUnreadCount((count) => count + (notification.is_read ? 0 : 1));
        toast(notification.title, {
          description: notification.message,
          action: notification.action_url ? {
            label: "View",
            onClick: () => { window.location.href = notification.action_url!; },
          } : undefined,
        });
      } catch (error) {
        console.error("Error reading live notification:", error);
      }
    };
    return () => source.close();
  }, [initialLoaded, notifications[0]?.created_at, userId]);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, addNotification, markAsRead, markAllAsRead,
      deleteAllNotifications, deleteNotification, fetchNotifications, isLoading,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
}
