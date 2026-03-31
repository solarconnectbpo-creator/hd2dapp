import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CloudRain, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function WeatherMonitoring() {
  const [isChecking, setIsChecking] = useState(false);

  // Get monitoring status
  const { data: status, isLoading: statusLoading } = trpc.weather.getMonitoringStatus.useQuery();

  // Get active storm alerts
  const { data: stormAlerts, isLoading: alertsLoading, refetch: refetchAlerts } = trpc.weather.getStormAlerts.useQuery();

  // Get alert history
  const { data: alertHistory, isLoading: historyLoading, refetch: refetchHistory } = trpc.weather.getAlertHistory.useQuery({ limit: 20 });

  // Manual check mutation
  const manualCheckMutation = trpc.weather.manualCheck.useMutation({
    onSuccess: () => {
      toast.success("Manual weather check completed");
      refetchAlerts();
      refetchHistory();
      setIsChecking(false);
    },
    onError: (error) => {
      toast.error(`Check failed: ${error.message}`);
      setIsChecking(false);
    },
  });

  const handleManualCheck = () => {
    setIsChecking(true);
    manualCheckMutation.mutate();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "extreme":
        return "destructive";
      case "severe":
        return "destructive";
      case "moderate":
        return "default";
      default:
        return "secondary";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case "immediate":
        return "destructive";
      case "expected":
        return "default";
      default:
        return "secondary";
    }
  };

  if (statusLoading || alertsLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Weather Monitoring Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time storm detection and automated content generation system
        </p>
      </div>

      {/* Monitoring Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CloudRain className="h-5 w-5" />
                Monitoring Status
              </CardTitle>
              <CardDescription>
                National Weather Service API integration for McKinney/Collin County
              </CardDescription>
            </div>
            <Button
              onClick={handleManualCheck}
              disabled={isChecking}
              variant="outline"
            >
              {isChecking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Manual Check
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">
                  {status?.isMonitoring ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Check Interval</p>
                <p className="font-semibold">{status?.checkInterval || "5 minutes"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Alerts</p>
                <p className="font-semibold">{stormAlerts?.length || 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Storm Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Storm Alerts
          </CardTitle>
          <CardDescription>
            Current severe weather alerts for McKinney area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stormAlerts || stormAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No active storm alerts</p>
              <p className="text-sm">All clear in McKinney/Collin County</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stormAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{alert.event}</h3>
                      <p className="text-sm text-muted-foreground">{alert.headline}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant={getUrgencyColor(alert.urgency)}>
                        {alert.urgency}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm">{alert.description}</p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Area: {alert.areaDesc}</span>
                    <span>Onset: {new Date(alert.onset).toLocaleString()}</span>
                    <span>Expires: {new Date(alert.expires).toLocaleString()}</span>
                  </div>
                  {alert.shouldTriggerContent && (
                    <Badge variant="default" className="bg-green-600">
                      ✅ Content Generation Triggered
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            Recent weather alerts and content generation activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!alertHistory || alertHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-2" />
              <p>No alert history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertHistory.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{alert.event}</p>
                      <Badge variant={getSeverityColor(alert.severity || "unknown")} className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.areaDesc}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : "Unknown date"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.contentTriggered ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Content Generated
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        No Content
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
          <p>
            <strong>1. Continuous Monitoring:</strong> System checks National Weather Service API every 5 minutes for severe weather alerts in McKinney/Collin County.
          </p>
          <p>
            <strong>2. Smart Filtering:</strong> Detects storm-related events (hail, tornado, thunderstorm, wind) with "Severe" or "Extreme" severity.
          </p>
          <p>
            <strong>3. Auto Content Generation:</strong> When a qualifying alert is detected, the AI automatically generates SEO-optimized blog content using proprietary Nimbus data.
          </p>
          <p>
            <strong>4. Instant Publishing:</strong> Generated content is immediately published to capture search traffic from affected homeowners.
          </p>
          <p>
            <strong>5. Owner Notifications:</strong> You receive notifications about detected alerts and published content.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
