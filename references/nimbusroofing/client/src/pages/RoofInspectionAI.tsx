import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Camera, 
  Upload, 
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Zap,
  DollarSign,
  Ruler,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";

/**
 * Roof Inspection AI Tool
 * Upload photos and get AI-powered damage detection
 */
export default function RoofInspectionAI() {
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Mock analysis results
  const mockAnalysis = {
    overallCondition: "Moderate Damage",
    severity: "medium",
    totalDamageArea: "245 sq ft",
    estimatedCost: "$4,850",
    findings: [
      {
        type: "Hail Damage",
        severity: "moderate",
        area: "120 sq ft",
        location: "North-facing slope",
        confidence: 92,
        description: "Multiple hail impact points detected across shingles. Granule loss visible in affected areas.",
        recommendation: "Replace damaged shingles. Document for insurance claim."
      },
      {
        type: "Missing Shingles",
        severity: "high",
        area: "35 sq ft",
        location: "Ridge cap",
        confidence: 98,
        description: "Several ridge cap shingles missing, exposing underlayment to weather.",
        recommendation: "Immediate replacement required to prevent water intrusion."
      },
      {
        type: "Wind Damage",
        severity: "moderate",
        area: "90 sq ft",
        location: "Southwest corner",
        confidence: 87,
        description: "Wind-lifted shingles with visible creasing and edge damage.",
        recommendation: "Replace affected shingles and inspect surrounding area."
      }
    ],
    lineItems: [
      { description: "Asphalt Shingle Replacement", quantity: "245 sq ft", unitPrice: "$3.50", total: "$857.50" },
      { description: "Ridge Cap Shingles", quantity: "35 linear ft", unitPrice: "$8.00", total: "$280.00" },
      { description: "Underlayment Repair", quantity: "90 sq ft", unitPrice: "$1.20", total: "$108.00" },
      { description: "Labor - Shingle Replacement", quantity: "8 hours", unitPrice: "$125.00", total: "$1,000.00" },
      { description: "Waste Disposal", quantity: "1 dumpster", unitPrice: "$450.00", total: "$450.00" },
      { description: "Materials Delivery", quantity: "1 trip", unitPrice: "$150.00", total: "$150.00" }
    ]
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map((file, index) => ({
      id: `photo-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file
    }));
    setUploadedPhotos([...uploadedPhotos, ...newPhotos]);
    toast.success(`${files.length} photo(s) uploaded`);
  };

  const handleAnalyze = async () => {
    if (uploadedPhotos.length === 0) {
      toast.error("Please upload at least one photo");
      return;
    }

    setAnalyzing(true);
    toast.info("Analyzing roof photos with AI...");

    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));

    setAnalyzing(false);
    setAnalysisComplete(true);
    toast.success("Analysis complete!");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-100 text-red-700 border-red-300";
      case "moderate": case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "low": return "bg-green-100 text-green-700 border-green-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "high": return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "moderate": case "medium": return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Roof Inspection AI</h1>
          <p className="text-slate-600 text-lg">Automated damage detection and supplement generation</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Upload Photos</CardTitle>
                <CardDescription>Drag and drop or click to upload roof inspection photos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Area */}
                <label className="block">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-slate-400">JPG, PNG up to 10MB each</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    multiple
                    onChange={handleFileUpload}
                  />
                </label>

                {/* Uploaded Photos */}
                {uploadedPhotos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-3">
                      Uploaded Photos ({uploadedPhotos.length})
                    </h3>
                    <div className="space-y-2">
                      {uploadedPhotos.map((photo) => (
                        <div key={photo.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <img 
                            src={photo.url} 
                            alt={photo.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{photo.name}</p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analyze Button */}
                <Button 
                  onClick={handleAnalyze}
                  disabled={analyzing || uploadedPhotos.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {analyzing ? (
                    <>
                      <Zap className="w-5 h-5 mr-2 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {!analysisComplete ? (
              <Card className="border-none shadow-lg">
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-slate-400">
                    <Camera className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-lg mb-2">Upload photos and click "Analyze with AI"</p>
                    <p className="text-sm">AI will detect damage and generate a detailed report</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Analysis Results</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-2" />
                          Export PDF
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Xactimate XML
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                        <div className="text-2xl font-bold text-slate-900">{mockAnalysis.overallCondition}</div>
                        <div className="text-sm text-slate-600">Overall Condition</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <Ruler className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-2xl font-bold text-slate-900">{mockAnalysis.totalDamageArea}</div>
                        <div className="text-sm text-slate-600">Damage Area</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        <div className="text-2xl font-bold text-slate-900">{mockAnalysis.estimatedCost}</div>
                        <div className="text-sm text-slate-600">Estimated Cost</div>
                      </div>
                      <div className="text-center p-4 bg-slate-50 rounded-lg">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <div className="text-2xl font-bold text-slate-900">{mockAnalysis.findings.length}</div>
                        <div className="text-sm text-slate-600">Issues Found</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Findings */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Detected Issues</CardTitle>
                    <CardDescription>AI-identified damage with confidence scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mockAnalysis.findings.map((finding, index) => (
                        <div key={index} className={`border-2 rounded-lg p-4 ${getSeverityColor(finding.severity)}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {getSeverityIcon(finding.severity)}
                              <div>
                                <h3 className="font-semibold text-slate-900">{finding.type}</h3>
                                <p className="text-sm text-slate-600">{finding.location}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-white">
                              {finding.confidence}% confident
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <div className="text-sm text-slate-600">Affected Area</div>
                              <div className="font-semibold text-slate-900">{finding.area}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-600">Severity</div>
                              <div className="font-semibold text-slate-900 capitalize">{finding.severity}</div>
                            </div>
                          </div>

                          <p className="text-sm text-slate-700 mb-3">{finding.description}</p>

                          <div className="bg-white/50 rounded p-3">
                            <div className="text-sm font-semibold text-slate-900 mb-1">Recommendation:</div>
                            <div className="text-sm text-slate-700">{finding.recommendation}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Cost Estimate</CardTitle>
                    <CardDescription>Detailed line-item breakdown for insurance supplement</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-semibold text-slate-900">Description</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900">Quantity</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900">Unit Price</th>
                            <th className="text-right py-3 px-4 font-semibold text-slate-900">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockAnalysis.lineItems.map((item, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-3 px-4 text-slate-700">{item.description}</td>
                              <td className="py-3 px-4 text-right text-slate-700">{item.quantity}</td>
                              <td className="py-3 px-4 text-right text-slate-700">{item.unitPrice}</td>
                              <td className="py-3 px-4 text-right font-semibold text-slate-900">{item.total}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50">
                            <td colSpan={3} className="py-4 px-4 text-right font-bold text-slate-900">Total Estimate:</td>
                            <td className="py-4 px-4 text-right font-bold text-slate-900 text-lg">{mockAnalysis.estimatedCost}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
