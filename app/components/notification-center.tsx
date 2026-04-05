"use client";

import { useEffect, useState } from "react";
import { getNotifications } from "../../lib/transactionService";
import { supabase } from "../../lib/supabaseClient";

interface Notification {
  id: string;
  type: string;
  message: string;
  admin_email: string;
  created_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial notifications
    loadNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    const { data, error } = await getNotifications();
    if (!error && data) {
      setNotifications(data);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "transaction_added":
        return "➕";
      case "transaction_deleted":
        return "🗑️";
      case "bulk_delete":
        return "🗑️";
      default:
        return "📢";
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.08]"
        title="Notifications"
      >
        <span className="text-zinc-400">🔔</span>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[92vw] rounded-2xl border border-white/15 bg-[#070c16] shadow-[0_12px_35px_rgba(0,0,0,0.45)]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">
                Notifications
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-zinc-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border-b border-white/5 p-4 last:border-b-0"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 break-words">
                        {notification.message}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                        <span>by {notification.admin_email}</span>
                        <span>•</span>
                        <span>{formatTime(notification.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
