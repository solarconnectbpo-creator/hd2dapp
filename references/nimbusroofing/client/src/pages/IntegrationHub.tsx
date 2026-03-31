import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plug, 
  CheckCircle2,
  XCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Search,
  Zap
} from "lucide-react";
import { toast } from "sonner";

/**
 * Integration Hub
 * Connect CRM, accounting, and other business systems
 */
export default function IntegrationHub() {
  const [searchQuery, setSearchQuery] = useState("");

  const integrations = [
    {
      id: "int-001",
      name: "Salesforce",
      category: "CRM",
      description: "Sync leads, contacts, and opportunities automatically",
      logo: "🔵",
      status: "connected",
      lastSync: "2 minutes ago",
      features: ["Lead sync", "Contact management", "Opportunity tracking", "Custom fields"]
    },
    {
      id: "int-002",
      name: "QuickBooks",
      category: "Accounting",
      description: "Automatically sync invoices, payments, and expenses",
      logo: "💚",
      status: "connected",
      lastSync: "5 minutes ago",
      features: ["Invoice sync", "Payment tracking", "Expense management", "Financial reports"]
    },
    {
      id: "int-003",
      name: "Jobber",
      category: "Field Service",
      description: "Manage jobs, scheduling, and customer communication",
      logo: "🔷",
      status: "connected",
      lastSync: "1 hour ago",
      features: ["Job scheduling", "Customer portal", "Time tracking", "Mobile app"]
    },
    {
      id: "int-004",
      name: "Google Calendar",
      category: "Calendar",
      description: "Sync appointments and inspections to your calendar",
      logo: "📅",
      status: "connected",
      lastSync: "10 minutes ago",
      features: ["Two-way sync", "Automatic reminders", "Team calendars", "Mobile notifications"]
    },
    {
      id: "int-005",
      name: "HubSpot",
      category: "CRM",
      description: "Marketing automation and customer relationship management",
      logo: "🟠",
      status: "available",
      lastSync: null,
      features: ["Marketing automation", "Email campaigns", "Lead scoring", "Analytics"]
    },
    {
      id: "int-006",
      name: "Xero",
      category: "Accounting",
      description: "Cloud accounting software for small businesses",
      logo: "💙",
      status: "available",
      lastSync: null,
      features: ["Invoicing", "Bank reconciliation", "Expense claims", "Financial reports"]
    },
    {
      id: "int-007",
      name: "Twilio",
      category: "Communication",
      description: "SMS and voice communication platform",
      logo: "🔴",
      status: "connected",
      lastSync: "Real-time",
      features: ["SMS messaging", "Voice calls", "Call recording", "Phone numbers"]
    },
    {
      id: "int-008",
      name: "Xactimate",
      category: "Insurance",
      description: "Industry-standard estimating software for insurance claims",
      logo: "📊",
      status: "available",
      lastSync: null,
      features: ["Estimate import/export", "Claim documentation", "Pricing database", "Report generation"]
    },
    {
      id: "int-009",
      name: "Mailchimp",
      category: "Marketing",
      description: "Email marketing and automation platform",
      logo: "📧",
      status: "available",
      lastSync: null,
      features: ["Email campaigns", "Audience segmentation", "Automation", "Analytics"]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-green-100 text-green-700";
      case "error": return "bg-red-100 text-red-700";
      case "available": return "bg-gray-100 text-gray-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected": return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "error": return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Plug className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleConnect = (integration: any) => {
    toast.success(`Connecting to ${integration.name}...`);
    // Simulate connection
    setTimeout(() => {
      toast.success(`Successfully connected to ${integration.name}!`);
    }, 2000);
  };

  const handleSync = (integration: any) => {
    toast.info(`Syncing ${integration.name}...`);
    setTimeout(() => {
      toast.success(`${integration.name} synced successfully!`);
    }, 1500);
  };

  const stats = [
    { label: "Connected", value: "4", color: "text-green-600" },
    { label: "Available", value: "5", color: "text-blue-600" },
    { label: "Total Syncs Today", value: "156", color: "text-purple-600" },
    { label: "Data Transferred", value: "2.4 GB", color: "text-orange-600" }
  ];

  const filteredIntegrations = integrations.filter(int =>
    int.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    int.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Integration Hub</h1>
          <p className="text-slate-600 text-lg">Connect your business systems for seamless data flow</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-slate-600">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input 
                placeholder="Search integrations..." 
                className="pl-12 text-lg h-12"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{integration.logo}</div>
                    <div>
                      <CardTitle className="text-xl mb-1">{integration.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{integration.category}</Badge>
                    </div>
                  </div>
                  {getStatusIcon(integration.status)}
                </div>
                <CardDescription className="text-base">{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Status */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <Badge className={getStatusColor(integration.status)}>
                      {integration.status}
                    </Badge>
                  </div>
                  {integration.lastSync && (
                    <div className="text-sm text-slate-600">
                      Last sync: {integration.lastSync}
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="mb-4">
                  <div className="text-sm font-semibold text-slate-700 mb-2">Features</div>
                  <div className="flex flex-wrap gap-2">
                    {integration.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {integration.status === "connected" ? (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleSync(integration)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
                        onClick={() => handleConnect(integration)}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Connect
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Card */}
        <Card className="border-none shadow-lg mt-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Need Help Connecting?</CardTitle>
            <CardDescription className="text-blue-100 text-base">
              Our team can help you set up integrations and customize data flows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button variant="secondary" size="lg">
                View Documentation
              </Button>
              <Button variant="outline" size="lg" className="text-white border-white hover:bg-white/10">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
