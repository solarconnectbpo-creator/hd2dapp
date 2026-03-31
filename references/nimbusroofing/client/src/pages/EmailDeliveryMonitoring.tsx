import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  MousePointerClick,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

export default function EmailDeliveryMonitoring() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);

  // Fetch email logs
  const { data: emailLogs, isLoading, refetch } = trpc.emailDelivery.getAll.useQuery({
    status: statusFilter !== "all" ? statusFilter as any : undefined,
    templateType: templateFilter !== "all" ? templateFilter as any : undefined,
    search: searchQuery || undefined,
    limit: 50,
    offset: 0,
  });

  // Fetch analytics
  const { data: analytics } = trpc.emailDelivery.getAnalytics.useQuery({
    days: selectedDays,
  });

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      queued: { variant: "secondary" as const, icon: Clock, color: "text-gray-500" },
      sent: { variant: "secondary" as const, icon: Mail, color: "text-blue-500" },
      delivered: { variant: "default" as const, icon: CheckCircle2, color: "text-green-500" },
      bounced: { variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
      failed: { variant: "destructive" as const, icon: AlertCircle, color: "text-red-500" },
      opened: { variant: "default" as const, icon: Eye, color: "text-purple-500" },
      clicked: { variant: "default" as const, icon: MousePointerClick, color: "text-indigo-500" },
    };

    const style = styles[status as keyof typeof styles] || styles.queued;
    const Icon = style.icon;

    return (
      <Badge variant={style.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${style.color}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Delivery Monitoring</h1>
            <p className="text-gray-600 mt-1">Track email delivery status and analytics in real-time</p>
          </div>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.total}</div>
                <p className="text-xs text-gray-500 mt-1">Last {selectedDays} days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.deliveryRate.toFixed(1)}%
                  </div>
                  {analytics.deliveryRate >= 95 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.delivered} / {analytics.total} delivered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {analytics.openRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.opened} / {analytics.delivered} opened
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${analytics.bounceRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                    {analytics.bounceRate.toFixed(1)}%
                  </div>
                  {analytics.bounceRate > 5 && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics.bounced} bounced emails
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Email Delivery Logs</CardTitle>
            <CardDescription>Filter and search email delivery records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by email or subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="clicked">Clicked</SelectItem>
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  <SelectItem value="callback_confirmation">Callback Confirmation</SelectItem>
                  <SelectItem value="lead_notification">Lead Notification</SelectItem>
                  <SelectItem value="sms_confirmation">SMS Confirmation</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDays.toString()} onValueChange={(v) => setSelectedDays(parseInt(v))}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Time Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : emailLogs && emailLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Delivered At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="font-medium">{log.to}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.templateType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {format(new Date(log.sentAt), "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {log.deliveredAt ? format(new Date(log.deliveredAt), "MMM d, yyyy h:mm a") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mb-4 text-gray-300" />
                <p className="text-lg font-medium">No emails found</p>
                <p className="text-sm">Try adjusting your filters or send some test emails</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <AlertCircle className="h-5 w-5" />
              SendGrid Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p className="mb-2">To enable real-time email tracking, configure SendGrid webhooks:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to SendGrid → Settings → Mail Settings → Event Webhook</li>
              <li>Enable Event Notification</li>
              <li>Set HTTP Post URL: <code className="bg-blue-100 px-2 py-1 rounded">https://your-domain.com/webhooks/sendgrid/events</code></li>
              <li>Select events: Delivered, Bounce, Open, Click, Dropped, Spam Report</li>
              <li>Save and verify webhook is active</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
