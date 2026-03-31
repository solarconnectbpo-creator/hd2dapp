import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Database, 
  FileText, 
  Wrench, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Target,
  BarChart3
} from "lucide-react";

/**
 * AI Ecosystem Dashboard
 * Unified view of all three core systems:
 * 1. Xactimate XML Validation
 * 2. Self-Reinforcing Data Flywheel
 * 3. MCP Server Architecture
 */
export default function AIEcosystemDashboard() {
  const [flywheelVelocity, setFlywheelVelocity] = useState(73);
  const [validationsPending, setValidationsPending] = useState(3);
  const [activeAgents, setActiveAgents] = useState(4);
  const [uploading, setUploading] = useState(false);

  const uploadFileMutation = trpc.validation.uploadFile.useMutation({
    onSuccess: (data) => {
      toast.success('File validated successfully!', {
        description: `Compliance Score: ${data.validationResult.complianceScore}/100`,
      });
      setValidationsPending(prev => prev + 1);
      setUploading(false);
    },
    onError: (error) => {
      toast.error('Upload failed', {
        description: error.message,
      });
      setUploading(false);
    },
  });

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;
    
    setUploading(true);
    const file = files[0]; // Process first file
    
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = e.target?.result as string;
        const base64Data = base64Content.split(',')[1]; // Remove data:mime;base64, prefix
        
        // Determine file type
        const extension = file.name.split('.').pop()?.toLowerCase();
        let fileType: 'xml' | 'pdf' | 'xlsx' | 'other' = 'other';
        if (extension === 'xml') fileType = 'xml';
        else if (extension === 'pdf') fileType = 'pdf';
        else if (extension === 'xlsx' || extension === 'xls') fileType = 'xlsx';
        
        await uploadFileMutation.mutateAsync({
          filename: file.name,
          fileContent: base64Data,
          fileType,
          fileSize: file.size,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to read file');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Nimbus IQ AI Ecosystem</h1>
          </div>
          <p className="text-blue-100">
            The complete AI-native roofing intelligence platform
          </p>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Flywheel Velocity */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Flywheel Velocity
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flywheelVelocity}/100</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
              <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                  style={{ width: `${flywheelVelocity}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Code Validations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Code Validations
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{validationsPending}</div>
              <p className="text-xs text-muted-foreground">
                Pending review
              </p>
              <Button variant="link" className="p-0 h-auto mt-2">
                View queue →
              </Button>
            </CardContent>
          </Card>

          {/* Active Agents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active AI Agents
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAgents}</div>
              <p className="text-xs text-muted-foreground">
                Processing tasks
              </p>
              <div className="flex gap-1 mt-2">
                <Badge variant="secondary" className="text-xs">Claims</Badge>
                <Badge variant="secondary" className="text-xs">SEO</Badge>
                <Badge variant="secondary" className="text-xs">CS</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="flywheel" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flywheel">
              <TrendingUp className="h-4 w-4 mr-2" />
              Data Flywheel
            </TabsTrigger>
            <TabsTrigger value="validation">
              <CheckCircle className="h-4 w-4 mr-2" />
              Code Validation
            </TabsTrigger>
            <TabsTrigger value="mcp">
              <Database className="h-4 w-4 mr-2" />
              MCP Server
            </TabsTrigger>
          </TabsList>

          {/* Data Flywheel Tab */}
          <TabsContent value="flywheel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Self-Reinforcing Data Flywheel</CardTitle>
                <CardDescription>
                  The four-step competitive advantage engine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Proprietary Data Generation */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Step 1</Badge>
                    <h3 className="font-semibold">Proprietary Data Generation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    AR Roof Scans and Paperwork Scanners generate unique, structured data
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">1,247</div>
                      <div className="text-xs text-muted-foreground">AR Scans Total</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">99.7%</div>
                      <div className="text-xs text-muted-foreground">Accuracy Rate</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">$4,285</div>
                      <div className="text-xs text-muted-foreground">Avg Supplement Value</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">856</div>
                      <div className="text-xs text-muted-foreground">Supplements Generated</div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Intelligent Content Automation */}
                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Step 2</Badge>
                    <h3 className="font-semibold">Intelligent Content Automation</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Proprietary data feeds Gemini/Gemma for hyper-specific content
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">127</div>
                      <div className="text-xs text-muted-foreground">Articles Generated</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">310</div>
                      <div className="text-xs text-muted-foreground">Keywords Covered</div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Market Authority */}
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Step 3</Badge>
                    <h3 className="font-semibold">Market Authority</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    SEO dominance and zero-click AI answers establish leadership
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">45</div>
                      <div className="text-xs text-muted-foreground">Top 10 Rankings</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">234</div>
                      <div className="text-xs text-muted-foreground">Zero-Click Answers</div>
                    </div>
                  </div>
                </div>

                {/* Step 4: Exponential Growth */}
                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Step 4</Badge>
                    <h3 className="font-semibold">Exponential Growth</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    User engagement strengthens data quality, creating virtuous cycle
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">+18.7%</div>
                      <div className="text-xs text-muted-foreground">AI Performance</div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded">
                      <div className="text-2xl font-bold">+34.2%</div>
                      <div className="text-xs text-muted-foreground">Revenue Growth</div>
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Full Flywheel Report
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Code Validation Tab */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Xactimate XML Validation</CardTitle>
                <CardDescription>
                  Cross-check estimates against Texas building codes using Gemini AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Estimate #2847</div>
                      <div className="text-sm text-muted-foreground">
                        123 Main St, McKinney TX
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Pending</Badge>
                    <Button size="sm">Validate</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <div className="font-medium">Estimate #2846</div>
                      <div className="text-sm text-muted-foreground">
                        456 Oak Ave, Plano TX
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Pending</Badge>
                    <Button size="sm">Validate</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <div className="font-medium">Estimate #2845</div>
                      <div className="text-sm text-muted-foreground">
                        789 Elm St, Frisco TX
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                      Compliant (92/100)
                    </Badge>
                    <Button size="sm" variant="outline">View Report</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <div className="font-medium">Estimate #2844</div>
                      <div className="text-sm text-muted-foreground">
                        321 Pine Rd, Allen TX
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900">
                      3 Warnings
                    </Badge>
                    <Button size="sm" variant="outline">View Report</Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                       onClick={() => document.getElementById('xactimate-upload')?.click()}>
                    <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="font-semibold mb-2">Upload Xactimate XML or PDF</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to browse
                    </p>
                    <input
                      id="xactimate-upload"
                      type="file"
                      accept=".xml,.pdf,.xlsx"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileUpload(e.target.files);
                        }
                      }}
                    />
                    <Button variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Supported formats: XML (Xactimate), PDF (EagleView, Invoices), XLSX (Estimates)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Building Code Database */}
            <Card>
              <CardHeader>
                <CardTitle>Texas Building Code Database</CardTitle>
                <CardDescription>
                  Complete code reference for McKinney, Collin County
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded">
                    <span className="font-medium">Wind Speed Requirement</span>
                    <span className="text-muted-foreground">115 mph</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded">
                    <span className="font-medium">Min Asphalt Shingle Weight</span>
                    <span className="text-muted-foreground">240 lb/sq</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded">
                    <span className="font-medium">Recommended Hail Rating</span>
                    <span className="text-muted-foreground">Class 4 IR</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded">
                    <span className="font-medium">Min Roof Slope</span>
                    <span className="text-muted-foreground">2:12</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Server Tab */}
          <TabsContent value="mcp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Context Protocol Server</CardTitle>
                <CardDescription>
                  Standardized interface for AI agent communication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resources */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Resources (4)
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded">
                      <div className="font-medium">Flywheel Metrics</div>
                      <div className="text-sm text-muted-foreground">
                        Real-time Data Flywheel performance metrics
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Building Codes</div>
                      <div className="text-sm text-muted-foreground">
                        Texas building code database (McKinney, Collin County)
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Knowledge Base</div>
                      <div className="text-sm text-muted-foreground">
                        Proprietary roofing knowledge (services, cities, keywords)
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Customer Reviews</div>
                      <div className="text-sm text-muted-foreground">
                        154 verified Google reviews (4.9 rating)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prompt Templates */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Prompt Templates (4)
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded">
                      <div className="font-medium">Roof Inspection Analysis</div>
                      <div className="text-sm text-muted-foreground">
                        SATCALC personality for damage assessment
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">SEO Content Generation</div>
                      <div className="text-sm text-muted-foreground">
                        Generate SEO-optimized roofing content
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Customer Service Response</div>
                      <div className="text-sm text-muted-foreground">
                        Empathetic, helpful customer responses
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Insurance Supplement</div>
                      <div className="text-sm text-muted-foreground">
                        Aggressive supplement with line-item justifications
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tools */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Actionable Tools (4)
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded">
                      <div className="font-medium">Validate Xactimate</div>
                      <div className="text-sm text-muted-foreground">
                        Cross-check XML against building codes
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Generate SEO Content</div>
                      <div className="text-sm text-muted-foreground">
                        Create optimized articles using Gemini
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Analyze Roof Photos</div>
                      <div className="text-sm text-muted-foreground">
                        Gemini Vision analysis of inspection photos
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Get Flywheel Metrics</div>
                      <div className="text-sm text-muted-foreground">
                        Retrieve current performance data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Registry */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    AI Agent Registry (4)
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 border rounded bg-blue-50 dark:bg-blue-950">
                      <div className="font-medium">Insurance Claims Agent</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Analyzes damage and generates aggressive supplements
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">building_codes</Badge>
                        <Badge variant="secondary" className="text-xs">roof_inspection</Badge>
                        <Badge variant="secondary" className="text-xs">validate_xactimate</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">Customer Service Agent</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Handles inquiries with empathy and expertise
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">knowledge_base</Badge>
                        <Badge variant="secondary" className="text-xs">customer_service</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">SEO Content Agent</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Generates optimized content using proprietary data
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">flywheel_metrics</Badge>
                        <Badge variant="secondary" className="text-xs">seo_content</Badge>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="font-medium">SATCALC Agent</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Aggressive supplement generation (Roof Math Monster)
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">building_codes</Badge>
                        <Badge variant="secondary" className="text-xs">analyze_photos</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
