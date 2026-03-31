import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");
  const [actionUrl, setActionUrl] = useState("");
  const [actionText, setActionText] = useState("");
  const [targetAllUsers, setTargetAllUsers] = useState(true);

  const { data: notifications, refetch } = trpc.notifications.getAll.useQuery({
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
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success("Notification deleted");
      refetch();
    },
  });

  const handleSendNotification = () => {
    if (!title || !message) {
      toast.error("Title and message are required");
      return;
    }

    createNotification.mutate({
      userId: targetAllUsers ? null : undefined,
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
        return "bg-green-100 text-green-800 border-green-300";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "error":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <img src="/nimbus-ai-logo.png" alt="Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner" className="h-10 w-10" />
              <span className="font-bold text-xl">Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-sm font-medium hover:text-primary">
                Admin Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Notification Management</h1>
          <p className="text-muted-foreground">
            Send custom notifications to users and manage existing notifications
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Create Notification Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send New Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="message">Message *</Label>
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
                  placeholder="https://example.com or /page"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="actionText">Action Button Text (Optional)</Label>
                <Input
                  id="actionText"
                  placeholder="View Details"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium text-sm">Send to all users</div>
                  <div className="text-xs text-muted-foreground">
                    Notification will be visible to everyone
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSendNotification}
                disabled={createNotification.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {createNotification.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {notifications && notifications.length > 0 ? (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-4 rounded-lg border ${getTypeColor(notif.type)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">{notif.title}</div>
                          <div className="text-sm mb-2">{notif.message}</div>
                          <div className="text-xs opacity-75">
                            {new Date(notif.createdAt).toLocaleString()}
                          </div>
                          {notif.actionUrl && (
                            <div className="text-xs mt-2">
                              <span className="font-medium">Action:</span> {notif.actionUrl}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteNotification.mutate({ id: notif.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Notification Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => {
                  setTitle("Storm Alert: Emergency Service Available");
                  setMessage("Severe weather detected in your area. Our 24/7 emergency team is ready to help with storm damage repairs.");
                  setType("warning");
                  setActionUrl("tel:+12146126696");
                  setActionText("Call Now");
                }}
              >
                <div className="font-semibold mb-1">Storm Alert</div>
                <div className="text-xs text-muted-foreground text-left">
                  Emergency service notification
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => {
                  setTitle("Special Offer: Free Roof Inspection");
                  setMessage("Schedule your free 21-point roof inspection this month and receive a detailed condition report.");
                  setType("success");
                  setActionUrl("/contact");
                  setActionText("Schedule Now");
                }}
              >
                <div className="font-semibold mb-1">Promotion</div>
                <div className="text-xs text-muted-foreground text-left">
                  Special offer announcement
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={() => {
                  setTitle("New Blog Post: Roof Maintenance Tips");
                  setMessage("Learn how to extend your roof's lifespan with our latest maintenance guide.");
                  setType("info");
                  setActionUrl("/blog");
                  setActionText("Read Article");
                }}
              >
                <div className="font-semibold mb-1">Content Update</div>
                <div className="text-xs text-muted-foreground text-left">
                  New blog post notification
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
