import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Workflow, 
  Play,
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  Zap,
  Settings
} from "lucide-react";

/**
 * Workflow Builder
 * Visual drag-and-drop automation creator
 */
export default function WorkflowBuilder() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);

  // Workflow templates
  const workflowTemplates = [
    {
      id: "wf-001",
      name: "Emergency Call Response",
      description: "Automatically handle emergency calls and dispatch crews",
      status: "active",
      triggers: 1,
      actions: 5,
      executions: 23,
      steps: [
        { type: "trigger", icon: Phone, label: "Incoming Call", color: "blue" },
        { type: "condition", icon: Zap, label: "Check if Emergency", color: "yellow" },
        { type: "action", icon: MessageSquare, label: "Send SMS to Crew", color: "green" },
        { type: "action", icon: Calendar, label: "Create Appointment", color: "purple" },
        { type: "action", icon: Mail, label: "Email Customer", color: "orange" }
      ]
    },
    {
      id: "wf-002",
      name: "Quote Follow-up",
      description: "Automated follow-up sequence for quote requests",
      status: "active",
      triggers: 1,
      actions: 4,
      executions: 45,
      steps: [
        { type: "trigger", icon: FileText, label: "Quote Sent", color: "blue" },
        { type: "delay", icon: Clock, label: "Wait 24 Hours", color: "gray" },
        { type: "action", icon: Mail, label: "Send Follow-up Email", color: "orange" },
        { type: "delay", icon: Clock, label: "Wait 48 Hours", color: "gray" },
        { type: "action", icon: Phone, label: "Call Customer", color: "green" }
      ]
    },
    {
      id: "wf-003",
      name: "Storm Alert Response",
      description: "Automatically reach out to customers after severe weather",
      status: "active",
      triggers: 1,
      actions: 3,
      executions: 12,
      steps: [
        { type: "trigger", icon: Zap, label: "Storm Detected", color: "red" },
        { type: "action", icon: MessageSquare, label: "Send SMS to All Customers", color: "green" },
        { type: "action", icon: Mail, label: "Email Inspection Offer", color: "orange" },
        { type: "action", icon: Calendar, label: "Open Inspection Slots", color: "purple" }
      ]
    }
  ];

  // Available workflow blocks
  const workflowBlocks = [
    { category: "Triggers", items: [
      { icon: Phone, label: "Incoming Call", color: "blue" },
      { icon: Mail, label: "Email Received", color: "orange" },
      { icon: FileText, label: "Form Submitted", color: "green" },
      { icon: Zap, label: "Weather Alert", color: "red" }
    ]},
    { category: "Actions", items: [
      { icon: MessageSquare, label: "Send SMS", color: "green" },
      { icon: Mail, label: "Send Email", color: "orange" },
      { icon: Phone, label: "Make Call", color: "blue" },
      { icon: Calendar, label: "Create Appointment", color: "purple" },
      { icon: FileText, label: "Generate Document", color: "gray" }
    ]},
    { category: "Logic", items: [
      { icon: Zap, label: "Condition", color: "yellow" },
      { icon: Clock, label: "Delay", color: "gray" },
      { icon: Workflow, label: "Branch", color: "purple" }
    ]}
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "paused": return "bg-yellow-100 text-yellow-700";
      case "draft": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStepColor = (color: string) => {
    const colors: any = {
      blue: "bg-blue-100 text-blue-700 border-blue-300",
      green: "bg-green-100 text-green-700 border-green-300",
      orange: "bg-orange-100 text-orange-700 border-orange-300",
      purple: "bg-purple-100 text-purple-700 border-purple-300",
      red: "bg-red-100 text-red-700 border-red-300",
      yellow: "bg-yellow-100 text-yellow-700 border-yellow-300",
      gray: "bg-gray-100 text-gray-700 border-gray-300"
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Workflow Builder</h1>
              <p className="text-slate-600 text-lg">Visual automation builder with drag-and-drop interface</p>
            </div>
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-600">
              <Plus className="w-5 h-5 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflow List */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Active Workflows</CardTitle>
                <CardDescription>Click to view and edit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowTemplates.map((workflow) => (
                    <div 
                      key={workflow.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedWorkflow?.id === workflow.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Workflow className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-slate-900">{workflow.name}</h3>
                        </div>
                        <Badge className={getStatusColor(workflow.status)}>
                          {workflow.status}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>

                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {workflow.triggers} trigger
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {workflow.actions} actions
                        </div>
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          {workflow.executions} runs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Workflow Blocks Palette */}
            <Card className="border-none shadow-lg mt-6">
              <CardHeader>
                <CardTitle>Workflow Blocks</CardTitle>
                <CardDescription>Drag to add to workflow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowBlocks.map((category, catIndex) => (
                    <div key={catIndex}>
                      <h3 className="font-semibold text-slate-900 mb-2 text-sm">{category.category}</h3>
                      <div className="space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <div 
                            key={itemIndex}
                            className={`p-3 rounded-lg border-2 cursor-move ${getStepColor(item.color)} hover:shadow-md transition-all`}
                          >
                            <div className="flex items-center gap-2">
                              <item.icon className="w-4 h-4" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Canvas */}
          <div className="lg:col-span-2">
            {selectedWorkflow ? (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedWorkflow.name}</CardTitle>
                      <CardDescription>{selectedWorkflow.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Test Run
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Workflow Visualization */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 min-h-[600px]">
                    <div className="flex flex-col items-center gap-4">
                      {selectedWorkflow.steps.map((step: any, index: number) => (
                        <div key={index} className="w-full max-w-md">
                          {/* Step Card */}
                          <div className={`p-6 rounded-xl border-2 shadow-lg ${getStepColor(step.color)} hover:shadow-xl transition-all cursor-pointer`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${step.type === 'trigger' ? 'bg-white' : 'bg-white/50'}`}>
                                <step.icon className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <div className="text-xs font-semibold uppercase mb-1 opacity-70">{step.type}</div>
                                <div className="font-semibold">{step.label}</div>
                              </div>
                              <Settings className="w-5 h-5 opacity-50 hover:opacity-100 cursor-pointer" />
                            </div>
                          </div>

                          {/* Connector */}
                          {index < selectedWorkflow.steps.length - 1 && (
                            <div className="flex justify-center my-2">
                              <div className="w-0.5 h-8 bg-slate-300"></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add Step Button */}
                    <div className="flex justify-center mt-6">
                      <Button variant="outline" className="border-dashed border-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </div>
                  </div>

                  {/* Workflow Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900">{selectedWorkflow.executions}</div>
                      <div className="text-sm text-slate-600">Total Executions</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">98.5%</div>
                      <div className="text-sm text-slate-600">Success Rate</div>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">2.3s</div>
                      <div className="text-sm text-slate-600">Avg Duration</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg">
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-slate-400">
                    <Workflow className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg mb-2">Select a workflow to view and edit</p>
                    <p className="text-sm">Or create a new workflow from scratch</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
