import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Calculator, FileText, AlertTriangle, DollarSign } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * SATCALC - The Roof Math Monster
 * 
 * Aggressive satellite/drone measurement analyst that catches every square foot
 * insurance adjusters try to skip. Speaks like a 20-year veteran supplement ninja.
 */

export default function SATCALCAnalyzer() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Upload some roof photos first, rookie!");
      return;
    }

    setAnalyzing(true);
    
    try {
      // TODO: Integrate with actual SATCALC analysis API
      // For now, simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setAnalysisResult({
        totalSquares: 42.8,
        wasteFactorSquares: 4.3,
        pitchMultiplier: 1.15,
        estimatedCost: 18500,
        moneyLeftOnTable: 4200,
        findings: [
          {
            type: "critical",
            title: "Ridge Cap Undercount",
            description: "Adjuster only measured 85 LF of ridge cap. Satellite shows 127 LF. That's 42 linear feet they're trying to skip.",
            dollarAmount: 840
          },
          {
            type: "warning",
            title: "Valley Metal Missing",
            description: "Zero valley metal on the estimate. I count 3 valleys totaling 68 LF. Classic adjuster move.",
            dollarAmount: 1360
          },
          {
            type: "critical",
            title: "Pitch Factor Ignored",
            description: "They used 1.0 multiplier on a 9/12 pitch roof. Should be 1.25. That's stealing squares.",
            dollarAmount: 1800
          },
          {
            type: "info",
            title: "Drip Edge Shortchanged",
            description: "Measured 180 LF, satellite shows 224 LF. Another 44 feet they hoped you wouldn't notice.",
            dollarAmount: 200
          }
        ]
      });
      
      toast.success("Analysis complete! Found $4,200 they tried to skip.");
    } catch (error) {
      toast.error("Analysis failed. Try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Calculator className="w-10 h-10 text-red-600" />
            <h1 className="text-4xl font-bold text-slate-900">SATCALC</h1>
          </div>
          <p className="text-xl text-slate-600 font-medium">
            The Roof Math Monster - Catching Every Square Foot They Try to Skip
          </p>
          <p className="text-sm text-slate-500 mt-1">
            20-year veteran supplement ninja. Zero tolerance for adjuster BS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Roof Photos
              </CardTitle>
              <CardDescription>
                Drop your CompanyCam photos or satellite images. I'll tell you exactly what they're trying to skip.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="photos">Roof Photos</Label>
                <Input
                  id="photos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="mt-2"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-sm text-slate-600 mt-2">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> Include overhead shots, ridge details, valleys, and any damage areas. 
                  The more angles, the more money I can find.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleAnalyze}
                disabled={analyzing || selectedFiles.length === 0}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {analyzing ? "Crunching the Numbers..." : "Analyze & Find the Money"}
              </Button>
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                Here's what the adjuster doesn't want you to see.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!analysisResult ? (
                <div className="text-center py-12 text-slate-400">
                  <Calculator className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Upload photos and hit analyze.</p>
                  <p className="text-sm">I'll show you the money.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600">Total Squares</p>
                      <p className="text-2xl font-bold text-slate-900">{analysisResult.totalSquares}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-red-600">Money Left on Table</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${analysisResult.moneyLeftOnTable.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-slate-900">What I Found:</h3>
                    {analysisResult.findings.map((finding: any, index: number) => (
                      <Alert
                        key={index}
                        className={
                          finding.type === "critical"
                            ? "border-red-200 bg-red-50"
                            : finding.type === "warning"
                            ? "border-orange-200 bg-orange-50"
                            : "border-blue-200 bg-blue-50"
                        }
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{finding.title}</h4>
                            <p className="text-sm text-slate-700">{finding.description}</p>
                          </div>
                          <div className="flex items-center gap-1 text-green-600 font-bold ml-4">
                            <DollarSign className="w-4 h-4" />
                            {finding.dollarAmount.toLocaleString()}
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>

                  <Button className="w-full" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Supplement Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SATCALC Personality Section */}
        <Card className="mt-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">How SATCALC Works</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-slate-700">
              I'm not here to be nice. I'm here to make sure you get every dollar you deserve. 
              Insurance adjusters play games—undercounting ridge cap, ignoring pitch multipliers, 
              "forgetting" valley metal. I catch it all.
            </p>
            <p className="text-slate-700 font-semibold">
              Upload your roof photos. I'll tell you exactly what they're trying to skip and how much money 
              you're leaving on the table. Then we'll write a supplement that makes them pay every penny.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
