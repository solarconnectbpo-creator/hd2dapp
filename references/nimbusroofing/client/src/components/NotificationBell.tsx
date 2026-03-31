import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  
  const { data: notifications, refetch } = trpc.notifications.getMyNotifications.useQuery({
    includeRead: false,
  });

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  const unreadCount = notifications?.length || 0;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-l-4 border-green-500 bg-green-50";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-50";
      case "error":
        return "border-l-4 border-red-500 bg-red-50";
      default:
        return "border-l-4 border-blue-500 bg-blue-50";
    }
  };

  const handleNotificationClick = (notif: any) => {
    markAsRead.mutate({ id: notif.id });
    if (notif.actionUrl) {
      if (notif.actionUrl.startsWith("http")) {
        window.open(notif.actionUrl, "_blank");
      } else {
        window.location.href = notif.actionUrl;
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              You have {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notif: any) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${getTypeColor(notif.type)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-semibold text-sm">{notif.title}</h4>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification.mutate({ id: notif.id });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {notif.actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {notif.actionText || "View"}
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No new notifications</p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
