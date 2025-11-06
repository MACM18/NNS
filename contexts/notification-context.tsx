"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import type {
  Notification,
  NotificationContextType,
} from "@/types/notifications";

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data as unknown as Notification[]) || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addNotification = async (
    notification: Omit<
      Notification,
      "id" | "user_id" | "is_read" | "created_at" | "updated_at"
    >
  ) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          ...notification,
          user_id: user.id,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      setNotifications((prev) => [data as unknown as Notification, ...prev]);

      // Show toast for immediate feedback
      toast(notification.title, {
        description: notification.message,
        action: notification.action_url
          ? {
              label: "View",
              onClick: () => (window.location.href = notification.action_url!),
            }
          : undefined,
      });
    } catch (error) {
      console.error("Error adding notification:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Fetch notifications on mount and user change
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as Notification) : n
              )
            );
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        fetchNotifications,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
