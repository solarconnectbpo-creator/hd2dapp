import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Clock,
  Phone,
  CheckCircle2,
  Zap,
  Users,
  Calendar,
  Target
} from "lucide-react";

/**
 * Automation Analytics Dashboard
 * Real-time performance metrics and business insights
 */
export default function AutomationAnalytics() {
  const kpis = [
    { 
      label: "Revenue Impact", 
      value: "$45,230", 
      change: "+18.2%", 
      trend: "up",
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    { 
      label: "Time Saved", 
      value: "127 hrs", 
      change: "+23.5%", 
      trend: "up",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    { 
      label: "Automation Rate", 
      value: "87%", 
      change: "+5.2%", 
      trend: "up",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    { 
      label: "Customer Satisfaction", 
      value: "4.8/5", 
      change: "+0.3", 
      trend: "up",
      icon: CheckCircle2,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  const automationMetrics = [
    { label: "Calls Handled", value: "234", icon: Phone, color: "text-blue-600" },
    { label: "Appointments Scheduled", value: "89", icon: Calendar, color: "text-green-600" },
    { label: "Leads Generated", value: "156", icon: Users, color: "text-purple-600" },
    { label: "Tasks Completed", value: "567", icon: CheckCircle2, color: "text-orange-600" }
  ];

  const workflowPerformance = [
    { name: "Emergency Call Response", executions: 45, successRate: 98.5, avgTime: "2.3s", revenue: "$12,450" },
    { name: "Quote Follow-up", executions: 89, successRate: 95.2, avgTime: "1.8s", revenue: "$18,230" },
    { name: "Storm Alert Response", executions: 23, successRate: 100, avgTime: "3.1s", revenue: "$8,550" },
    { name: "Inspection Reminder", executions: 67, successRate: 92.1, avgTime: "1.5s", revenue: "$6,000" }
  ];

  const recentActivity = [
    { time: "2 min ago", action: "Emergency call handled", workflow: "Emergency Response", status: "success" },
    { time: "5 min ago", action: "Quote follow-up sent", workflow: "Quote Follow-up", status: "success" },
    { time: "8 min ago", action: "Appointment scheduled", workflow: "Emergency Response", status: "success" },
    { time: "12 min ago", action: "Storm alert sent to 234 customers", workflow: "Storm Alert", status: "success" },
    { time: "15 min ago", action: "Inspection reminder sent", workflow: "Inspection Reminder", status: "success" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Automation Analytics</h1>
          <p className="text-slate-600 text-lg">Real-time performance metrics and business insights</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${kpi.bgColor} rounded-xl flex items-center justify-center`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <TrendingUp className="w-4 h-4" />
                    {kpi.change}
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{kpi.value}</div>
                <div className="text-sm text-slate-600">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Automation Metrics */}
        <Card className="border-none shadow-lg mb-8">
          <CardHeader>
            <CardTitle>Today's Automation Metrics</CardTitle>
            <CardDescription>Real-time activity across all workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {automationMetrics.map((metric, index) => (
                <div key={index} className="text-center p-6 bg-slate-50 rounded-xl">
                  <metric.icon className={`w-10 h-10 mx-auto mb-3 ${metric.color}`} />
                  <div className="text-3xl font-bold text-slate-900 mb-1">{metric.value}</div>
                  <div className="text-sm text-slate-600">{metric.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workflow Performance */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Workflow Performance</CardTitle>
              <CardDescription>Success rates and revenue impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workflowPerformance.map((workflow, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                      <span className="text-sm font-semibold text-green-600">{workflow.revenue}</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-slate-600">Executions</div>
                        <div className="font-semibold text-slate-900">{workflow.executions}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Success Rate</div>
                        <div className="font-semibold text-slate-900">{workflow.successRate}%</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Avg Time</div>
                        <div className="font-semibold text-slate-900">{workflow.avgTime}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${workflow.successRate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live automation events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 mb-1">{activity.action}</div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span>{activity.time}</span>
                        <span>•</span>
                        <span>{activity.workflow}</span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROI Calculator */}
        <Card className="border-none shadow-lg mt-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">💰 Your Automation ROI</CardTitle>
            <CardDescription className="text-blue-100 text-base">
              Based on current performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-6 h-6" />
                  <div className="text-sm font-semibold">Time Saved</div>
                </div>
                <div className="text-3xl font-bold mb-1">127 hours</div>
                <div className="text-sm text-blue-100">= $15,875 in labor costs</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-6 h-6" />
                  <div className="text-sm font-semibold">Revenue Generated</div>
                </div>
                <div className="text-3xl font-bold mb-1">$45,230</div>
                <div className="text-sm text-blue-100">From automated workflows</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-6 h-6" />
                  <div className="text-sm font-semibold">Total ROI</div>
                </div>
                <div className="text-3xl font-bold mb-1">342%</div>
                <div className="text-sm text-blue-100">Return on investment</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
