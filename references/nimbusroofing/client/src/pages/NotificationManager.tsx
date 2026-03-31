import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Send, Trash2, CheckCircle2 } from "lucide-react";

export default function NotificationManager() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [actionUrl, setActionUrl] = useState("");
  const [actionText, setActionText] = useState("");

  const utils = trpc.useUtils();
  
  const { data: notifications, isLoading } = trpc.notifications.getAll.useQuery({
    limit: 100,
    offset: 0,
  });

  const createNotification = trpc.notifications.create.useMutation({
    onSuccess: () => {
      toast.success("Notification sent successfully!");
      setTitle("");
      setMessage("");
      setActionUrl("");
      setActionText("");
      utils.notifications.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success("Notification deleted");
      utils.notifications.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }

    createNotification.mutate({
      userId: null, // null = broadcast to all users
      title,
      message,
      type,
      actionUrl: actionUrl || undefined,
      actionText: actionText || undefined,
    });
  };

  const getTypeColor = (notifType: string) => {
    switch (notifType) {
      case "success":
        return "text-green-600 bg-green-50";
      case "warning":
        return "text-yellow-600 bg-yellow-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-blue-600 bg-blue-50";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Manager
          </h1>
          <p className="text-gray-600 mt-2">
            Send notifications to all website users
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle>Send New Notification</CardTitle>
              <CardDescription>
                Create and broadcast a notification to all users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Notification message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="actionUrl">Action URL (Optional)</Label>
                <Input
                  id="actionUrl"
                  placeholder="/blog or https://example.com"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="actionText">Action Button Text (Optional)</Label>
                <Input
                  id="actionText"
                  placeholder="Learn More"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                />
              </div>

              <Button
                onClick={handleSend}
                disabled={createNotification.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {createNotification.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </CardContent>
          </Card>

          {/* Notification History */}
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Recently sent notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(notif.type)}`}>
                              {notif.type}
                            </span>
                            {notif.isRead && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <h4 className="font-semibold mt-2">{notif.title}</h4>
                          <p className="text-sm text-gray-600">{notif.message}</p>
                          {notif.actionUrl && (
                            <p className="text-xs text-blue-600 mt-1">
                              Action: {notif.actionText || notif.actionUrl}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification.mutate({ id: notif.id })}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No notifications sent yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
