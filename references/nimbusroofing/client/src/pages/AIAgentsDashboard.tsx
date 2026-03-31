import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Zap,
  Brain,
  Shield,
  DollarSign,
  FileText
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const agentIcons: Record<string, any> = {
  ClaimAnalyzer: FileText,
  FraudDetector: Shield,
  PricingAgent: DollarSign,
  RoutingAgent: Zap,
  PaymentAgent: DollarSign,
  DocumentationAgent: FileText,
};

export default function AIAgentsDashboard() {
  const { user } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<string | undefined>();

  const { data: metrics, isLoading } = trpc.agents.getAgentMetrics.useQuery(
    { agentName: selectedAgent as any },
    { enabled: user?.role === "admin" }
  );

  const { data: pendingTasks } = trpc.agents.getPendingTasks.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const initPatterns = trpc.agents.initializeFraudPatterns.useMutation();

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>
              This dashboard is only accessible to administrators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent metrics...</p>
        </div>
      </div>
    );
  }

  // Calculate aggregate metrics
  const totalTasks = metrics?.reduce((sum, m) => sum + m.tasksCompleted + m.tasksFailed, 0) || 0;
  const totalCompleted = metrics?.reduce((sum, m) => sum + m.tasksCompleted, 0) || 0;
  const totalFailed = metrics?.reduce((sum, m) => sum + m.tasksFailed, 0) || 0;
  const avgExecutionTime = metrics?.length
    ? Math.round(metrics.reduce((sum, m) => sum + (m.avgExecutionTimeMs || 0), 0) / metrics.length)
    : 0;
  const totalCost = metrics?.reduce((sum, m) => sum + m.totalCostCents, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Material Design */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-accent text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiA0NGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="container relative">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 text-white border-white/30 mb-6 px-4 py-1">
              <Brain className="h-4 w-4 mr-2 inline" />
              Admin Dashboard
            </Badge>
            <h1 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
              AI Agent Dashboard
            </h1>
            <p className="text-xl text-white/90 font-light">
              Monitor and manage AI agent performance, tasks, and metrics
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTasks}</div>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalCompleted}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Avg Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgExecutionTime}ms</div>
              <p className="text-xs text-gray-500 mt-1">Per task</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                Total Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${(totalCost / 100).toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">API costs</p>
            </CardContent>
          </Card>
        </div>

        {/* Agent Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={!selectedAgent ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedAgent(undefined)}
          >
            All Agents
          </Button>
          {["ClaimAnalyzer", "FraudDetector", "PricingAgent", "RoutingAgent", "PaymentAgent", "DocumentationAgent"].map(
            (agent) => {
              const Icon = agentIcons[agent];
              return (
                <Button
                  key={agent}
                  variant={selectedAgent === agent ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedAgent(agent)}
                  className="gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {agent}
                </Button>
              );
            }
          )}
        </div>

        {/* Agent Metrics Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Agent Performance Metrics</CardTitle>
            <CardDescription>
              Detailed performance data for each AI agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!metrics || metrics.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No metrics available yet</p>
                <p className="text-sm text-gray-400">
                  Metrics will appear after agents complete their first tasks
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-sm">Agent</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Completed</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Failed</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Success Rate</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Avg Time</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((metric) => {
                      const Icon = agentIcons[metric.agentName];
                      const total = metric.tasksCompleted + metric.tasksFailed;
                      const successRate = total > 0 ? Math.round((metric.tasksCompleted / total) * 100) : 0;

                      return (
                        <tr key={metric.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-gray-600" />
                              <span className="font-medium">{metric.agentName}</span>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4 text-green-600 font-semibold">
                            {metric.tasksCompleted}
                          </td>
                          <td className="text-right py-3 px-4 text-red-600 font-semibold">
                            {metric.tasksFailed}
                          </td>
                          <td className="text-right py-3 px-4">
                            <Badge variant={successRate >= 90 ? "default" : successRate >= 70 ? "secondary" : "destructive"}>
                              {successRate}%
                            </Badge>
                          </td>
                          <td className="text-right py-3 px-4 text-gray-700">
                            {metric.avgExecutionTimeMs}ms
                          </td>
                          <td className="text-right py-3 px-4 text-gray-700">
                            ${(metric.totalCostCents / 100).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Tasks Queue</CardTitle>
                <CardDescription>
                  Real-time view of queued agent tasks
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {pendingTasks?.length || 0} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!pendingTasks || pendingTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500">All tasks completed!</p>
                <p className="text-sm text-gray-400 mt-2">
                  No pending tasks in the queue
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => {
                  const Icon = agentIcons[task.agentName];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-blue-600" />
                        <div>
                          <div className="font-semibold">{task.taskType}</div>
                          <div className="text-sm text-gray-600">{task.agentName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge>Priority: {task.priority}</Badge>
                        <Badge variant="outline">{task.status}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(task.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>
              System maintenance and initialization tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-semibold">Initialize Fraud Patterns</div>
                  <div className="text-sm text-gray-600">
                    Load 25+ default fraud detection patterns into database
                  </div>
                </div>
                <Button
                  onClick={() => initPatterns.mutate()}
                  disabled={initPatterns.isLoading}
                >
                  {initPatterns.isLoading ? "Initializing..." : "Initialize"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
