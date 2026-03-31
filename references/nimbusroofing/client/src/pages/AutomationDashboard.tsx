import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { 
  Phone, 
  Camera, 
  Workflow, 
  Plug, 
  BarChart3, 
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calculator
} from "lucide-react";

/**
 * Nimbus IQ AI Automation Platform Dashboard
 * Central hub for accessing all automation tools
 */
export default function AutomationDashboard() {
  const automationTools = [
    {
      icon: Calculator,
      title: "SATCALC Analyzer",
      description: "The Roof Math Monster - Aggressive supplement generation",
      href: "/automation/satcalc",
      color: "text-red-600",
      bgColor: "bg-red-50",
      stats: { label: "Supplements", value: "7" }
    },
    {
      icon: Phone,
      title: "Voice AI",
      description: "Automated call handling with natural language understanding",
      href: "/automation/voice-ai",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      stats: { label: "Calls Today", value: "23" }
    },
    {
      icon: Camera,
      title: "Roof Inspection AI",
      description: "Automated damage detection and supplement generation",
      href: "/automation/roof-inspection",
      color: "text-green-500",
      bgColor: "bg-green-50",
      stats: { label: "Inspections", value: "12" }
    },
    {
      icon: Workflow,
      title: "Workflow Builder",
      description: "Visual automation builder with drag-and-drop interface",
      href: "/automation/workflows",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      stats: { label: "Active Workflows", value: "8" }
    },
    {
      icon: Plug,
      title: "Integration Hub",
      description: "Connect CRM, accounting, and other business systems",
      href: "/automation/integrations",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      stats: { label: "Connected", value: "4" }
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Real-time performance metrics and business insights",
      href: "/automation/analytics",
      color: "text-pink-500",
      bgColor: "bg-pink-50",
      stats: { label: "ROI This Month", value: "+342%" }
    }
  ];

  const quickStats = [
    { label: "Time Saved Today", value: "4.2 hours", icon: Clock, trend: "+12%" },
    { label: "Automation Rate", value: "87%", icon: Zap, trend: "+5%" },
    { label: "Tasks Completed", value: "156", icon: CheckCircle2, trend: "+23%" },
    { label: "Revenue Impact", value: "$12,450", icon: TrendingUp, trend: "+18%" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Nimbus IQ AI Platform</h1>
              <p className="text-slate-600 text-lg">Intelligent Automation for Roofing Operations</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-semibold text-green-600">{stat.trend}</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Automation Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Automation Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {automationTools.map((tool, index) => (
              <Link key={index} href={tool.href}>
                <Card className="border-none shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group h-full">
                  <CardHeader>
                    <div className={`w-16 h-16 ${tool.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <tool.icon className={`w-8 h-8 ${tool.color}`} />
                    </div>
                    <CardTitle className="text-xl mb-2">{tool.title}</CardTitle>
                    <CardDescription className="text-base">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <div className="text-sm text-slate-600">{tool.stats.label}</div>
                        <div className="text-2xl font-bold text-slate-900">{tool.stats.value}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="group-hover:bg-slate-100">
                        Open →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">🚀 Getting Started with Automation</CardTitle>
            <CardDescription className="text-blue-100 text-base">
              Follow these steps to maximize your automation ROI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl font-bold mb-2">1</div>
                <div className="font-semibold mb-2">Set Up Voice AI</div>
                <div className="text-sm text-blue-100">Configure your phone system to handle calls automatically</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl font-bold mb-2">2</div>
                <div className="font-semibold mb-2">Connect Integrations</div>
                <div className="text-sm text-blue-100">Link your CRM and accounting software for seamless data flow</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <div className="text-3xl font-bold mb-2">3</div>
                <div className="font-semibold mb-2">Build Workflows</div>
                <div className="text-sm text-blue-100">Create custom automation to handle repetitive tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
