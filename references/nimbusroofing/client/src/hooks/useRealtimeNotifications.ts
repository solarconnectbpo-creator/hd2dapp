import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

interface NotificationData {
  type: string;
  data?: any;
  message: string;
  timestamp: string;
}

/**
 * React hook for real-time notifications via Server-Sent Events (SSE)
 * Automatically reconnects on disconnect
 */
export function useRealtimeNotifications() {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const clientId = useRef(`client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE connection
      const eventSource = new EventSource(
        `/api/notifications/stream?clientId=${clientId.current}`
      );

      eventSource.onopen = () => {
        console.log("[SSE] Connected to real-time notifications");
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: NotificationData = JSON.parse(event.data);
          console.log("[SSE] Received notification:", notification);

          // Add to notifications list
          setNotifications((prev) => [notification, ...prev].slice(0, 50)); // Keep last 50
          setUnreadCount((prev) => prev + 1);

          // Show toast notification
          if (notification.type !== "connected") {
            showToastForNotification(notification);
            
            // Play notification sound
            playNotificationSound();
          }
        } catch (error) {
          console.error("[SSE] Error parsing notification:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("[SSE] Connection error:", error);
        setIsConnected(false);
        eventSource.close();

        // Attempt to reconnect after 5 seconds
        reconnectTimeout = setTimeout(() => {
          console.log("[SSE] Attempting to reconnect...");
          connect();
        }, 5000);
      };

      eventSourceRef.current = eventSource;
    };

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const showToastForNotification = (notification: NotificationData) => {
    switch (notification.type) {
      case "new_callback":
        toast.success(notification.message, {
          description: `Phone: ${notification.data?.phone}`,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/admin/callbacks";
            },
          },
        });
        break;

      case "callback_updated":
        toast.info(notification.message, {
          description: `Status: ${notification.data?.status}`,
        });
        break;

      case "new_lead":
        toast.success(notification.message, {
          description: `Source: ${notification.data?.source}`,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = "/admin";
            },
          },
        });
        break;

      case "sms_sent":
        toast.success(notification.message, {
          description: "SMS delivered successfully",
        });
        break;

      case "call_initiated":
        toast.info(notification.message, {
          description: "Call in progress...",
        });
        break;

      default:
        toast(notification.message);
    }
  };

  const playNotificationSound = () => {
    // Create a simple notification beep
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error("[SSE] Error playing notification sound:", error);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return {
    isConnected,
    notifications,
    unreadCount,
    clearNotifications,
    markAsRead,
  };
}
