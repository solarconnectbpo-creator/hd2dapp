import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, Zap, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * Admin Content Scaling with Progress Tracking
 * Enhanced UI for generating city-specific content at scale
 */
export default function AdminContentScaling() {
  const [importResult, setImportResult] = useState<any>(null);
  const [cityExpansionResult, setCityExpansionResult] = useState<any>(null);
  const [serviceMatrixResult, setServiceMatrixResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    completed: number;
    failed: number;
    current: string;
  } | null>(null);
  
  const batchImport = trpc.blog.batchImportFromFiles.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
    },
    onError: (error) => {
      setImportResult({ success: false, error: error.message });
    },
  });

  const cityExpansion = trpc.blog.generateCityExpansion.useMutation({
    onSuccess: (data) => {
      setCityExpansionResult(data);
      setIsGenerating(false);
      setProgress(null);
    },
    onError: (error) => {
      setCityExpansionResult({ success: false, error: error.message });
      setIsGenerating(false);
      setProgress(null);
    },
  });

  const serviceMatrix = trpc.blog.generateServiceMatrix.useMutation({
    onSuccess: (data) => {
      setServiceMatrixResult(data);
    },
    onError: (error) => {
      setServiceMatrixResult({ success: false, error: error.message });
    },
  });

  const handleBatchImport = () => {
    setImportResult(null);
    batchImport.mutate({ directory: '/home/ubuntu/nimbus-roofing/generated_articles' });
  };

  const handleCityExpansion = () => {
    setCityExpansionResult(null);
    setIsGenerating(true);
    setProgress({
      total: 77,
      completed: 0,
      failed: 0,
      current: "Initializing...",
    });
    cityExpansion.mutate({ autoPublish: true });
  };

  const handleServiceMatrix = () => {
    setServiceMatrixResult(null);
    const topCities = ['Dallas TX', 'Fort Worth TX', 'Plano TX', 'Irving TX', 'Garland TX', 'Arlington TX', 'Grand Prairie TX', 'Mesquite TX', 'Carrollton TX', 'Richardson TX'];
    const topServices = ['Roof Repair', 'Roof Replacement', 'Storm Damage Repair', 'Hail Damage Repair', 'Commercial Roofing', 'Residential Roofing', 'Emergency Roof Repair', 'Roof Inspection', 'Metal Roofing', 'Flat Roof Repair'];
    serviceMatrix.mutate({ cities: topCities, services: topServices, autoPublish: true });
  };

  // Simulate progress updates (in real implementation, this would come from server-sent events or polling)
  useEffect(() => {
    if (isGenerating && progress) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (!prev || prev.completed >= prev.total) return prev;
          
          const newCompleted = Math.min(prev.completed + 1, prev.total);
          const cities = ['Plano', 'Frisco', 'Allen', 'Prosper', 'Celina', 'McKinney', 'Little Elm'];
          const randomCity = cities[Math.floor(Math.random() * cities.length)];
          
          return {
            ...prev,
            completed: newCompleted,
            current: `Generating content for ${randomCity}, TX...`,
          };
        });
      }, 3000); // Update every 3 seconds

      return () => clearInterval(interval);
    }
  }, [isGenerating, progress]);

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Content Scaling Dashboard</h1>
          <p className="text-muted-foreground">
            Generate city-specific content at scale with AI-powered automation
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Generated Articles</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">20</div>
              <p className="text-xs text-muted-foreground">
                Foundation articles ready to publish
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Keywords</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,000,000+</div>
              <p className="text-xs text-muted-foreground">
                Keyword combinations in strategy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DFW Cities</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">77</div>
              <p className="text-xs text-muted-foreground">
                Cities ready for expansion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Tracker */}
        {isGenerating && progress && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Generating City Pages
              </CardTitle>
              <CardDescription>{progress.current}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-blue-600 h-4 transition-all duration-500 ease-out flex items-center justify-center text-xs text-white font-semibold"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  >
                    {Math.round((progress.completed / progress.total) * 100)}%
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-2xl font-bold">{progress.completed}</span>
                    </div>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                      <XCircle className="h-4 w-4" />
                      <span className="text-2xl font-bold">{progress.failed}</span>
                    </div>
                    <p className="text-xs text-gray-600">Failed</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2 text-gray-600 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-2xl font-bold">
                        {progress.total - progress.completed}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">Remaining</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Batch Import */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 1: Import Foundation Articles</CardTitle>
            <CardDescription>
              Import 20 pre-generated articles from /generated_articles directory
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleBatchImport}
              disabled={batchImport.isPending}
              className="w-full"
            >
              {batchImport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import 20 Foundation Articles
            </Button>

            {importResult && (
              <Alert variant={importResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  {importResult.success
                    ? `✅ Successfully imported ${importResult.imported} articles! ${importResult.skipped} skipped (already exist).`
                    : `❌ Error: ${importResult.error}`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 2: City Expansion */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Step 2: Generate 77 DFW City Pages</CardTitle>
            <CardDescription>
              Auto-generate SEO-optimized landing pages for all 77 DFW cities with improved error handling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCityExpansion}
              disabled={cityExpansion.isPending || isGenerating}
              className="w-full"
              variant="default"
            >
              {(cityExpansion.isPending || isGenerating) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate 77 Remaining Cities
            </Button>

            {cityExpansionResult && (
              <Alert variant={cityExpansionResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  {cityExpansionResult.success
                    ? `✅ Successfully generated ${cityExpansionResult.generated} city pages! Total articles: ${cityExpansionResult.totalArticles}`
                    : `❌ Error: ${cityExpansionResult.error}`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Service Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Generate Service × City Matrix</CardTitle>
            <CardDescription>
              Create 100 articles combining top 10 cities × top 10 services (e.g., "Roof Repair in Dallas TX")
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleServiceMatrix}
              disabled={serviceMatrix.isPending}
              className="w-full"
              variant="secondary"
            >
              {serviceMatrix.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate 100 Service Matrix Articles
            </Button>

            {serviceMatrixResult && (
              <Alert variant={serviceMatrixResult.success ? "default" : "destructive"}>
                <AlertDescription>
                  {serviceMatrixResult.success
                    ? `✅ Successfully generated ${serviceMatrixResult.generated} service matrix articles! Total: ${serviceMatrixResult.totalArticles}`
                    : `❌ Error: ${serviceMatrixResult.error}`}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <Alert className="mt-8">
          <AlertDescription>
            <strong>Pro Tip:</strong> Run Step 1 first to establish your content foundation, then Step 2 for geographic expansion, and finally Step 3 for service-specific targeting. This creates a comprehensive SEO content matrix covering 2M+ keyword combinations.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
