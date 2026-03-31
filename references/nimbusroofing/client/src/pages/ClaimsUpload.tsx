import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Shield,
  TrendingUp,
  Clock,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

export default function ClaimsUpload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [claimNumber, setClaimNumber] = useState("");
  const [insuranceCompany, setInsuranceCompany] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentClaimId, setCurrentClaimId] = useState<number | null>(null);

  const { data: claims, refetch: refetchClaims } = trpc.agents.getMyClaims.useQuery(undefined, {
    enabled: !!user,
  });

  const uploadClaim = trpc.agents.uploadClaim.useMutation();
  const analyzeClaim = trpc.agents.analyzeClaim.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (!base64) {
          toast.error("Failed to read file");
          return;
        }

        // Upload claim
        const result = await uploadClaim.mutateAsync({
          fileName: file.name,
          fileData: base64,
          claimNumber: claimNumber || undefined,
          insuranceCompany: insuranceCompany || undefined,
        });

        toast.success("Claim uploaded successfully!");
        setCurrentClaimId(result.claimId);

        // Auto-analyze
        setAnalyzing(true);
        try {
          await analyzeClaim.mutateAsync({ claimId: result.claimId });
          toast.success("Analysis complete!");
          refetchClaims();
        } catch (error: any) {
          toast.error(`Analysis failed: ${error.message}`);
        } finally {
          setAnalyzing(false);
        }

        // Reset form
        setFile(null);
        setClaimNumber("");
        setInsuranceCompany("");
        setUploading(false);
      };

      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Login Required</CardTitle>
            <CardDescription>
              You need to be logged in to upload insurance claims
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button className="w-full">Go Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Material Design */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-accent text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiA0NGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="container relative">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 text-white border-white/30 mb-6 px-4 py-1">
              <Shield className="h-4 w-4 mr-2 inline" />
              AI-Powered Claim Analysis
            </Badge>
            <h1 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
              Insurance Claim Analysis
            </h1>
            <p className="text-xl text-white/90 font-light">
              Upload your insurance claim for AI-powered analysis and fraud detection
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12">

        {/* Upload Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Claim Document</CardTitle>
            <CardDescription>
              Upload your insurance claim PDF for instant analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Claim Document (PDF)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  disabled={uploading || analyzing}
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="claimNumber">Claim Number (Optional)</Label>
                <Input
                  id="claimNumber"
                  value={claimNumber}
                  onChange={(e) => setClaimNumber(e.target.value)}
                  placeholder="e.g., CLM-2024-12345"
                  disabled={uploading || analyzing}
                />
              </div>

              <div>
                <Label htmlFor="insuranceCompany">Insurance Company (Optional)</Label>
                <Input
                  id="insuranceCompany"
                  value={insuranceCompany}
                  onChange={(e) => setInsuranceCompany(e.target.value)}
                  placeholder="e.g., State Farm, Allstate"
                  disabled={uploading || analyzing}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!file || uploading || analyzing}
                className="w-full gap-2"
                size="lg"
              >
                {uploading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : analyzing ? (
                  <>
                    <TrendingUp className="h-5 w-5 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload & Analyze
                  </>
                )}
              </Button>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                <p className="font-semibold text-yellow-800 mb-2">⚠️ Legal Disclaimer</p>
                <p className="text-yellow-700">
                  Nimbus Roofing is a licensed contractor, NOT a public adjuster (Texas §4102).
                  This analysis is advisory only and does not constitute legal or insurance advice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Claims</CardTitle>
            <CardDescription>
              View analysis results and fraud detection reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!claims || claims.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No claims uploaded yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Upload your first claim to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-lg">
                          {claim.claimNumber || `Claim #${claim.id}`}
                        </div>
                        {claim.insuranceCompany && (
                          <div className="text-sm text-gray-600">
                            {claim.insuranceCompany}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Uploaded {new Date(claim.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            claim.status === "approved"
                              ? "default"
                              : claim.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {claim.status}
                        </Badge>
                        {claim.fraudScore > 0 && (
                          <Badge
                            variant={
                              claim.fraudScore >= 70
                                ? "destructive"
                                : claim.fraudScore >= 40
                                ? "secondary"
                                : "outline"
                            }
                            className="gap-1"
                          >
                            <Shield className="h-3 w-3" />
                            Fraud Risk: {claim.fraudScore}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {claim.lineItems && claim.lineItems.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold mb-2">Line Items Found:</div>
                        <div className="text-sm text-gray-700">
                          {claim.lineItems.length} items detected
                        </div>
                      </div>
                    )}

                    {claim.missingItems && claim.missingItems.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-orange-600">
                          <AlertTriangle className="h-4 w-4" />
                          Missing Required Items:
                        </div>
                        <div className="text-sm text-gray-700">
                          {claim.missingItems.join(", ")}
                        </div>
                      </div>
                    )}

                    {claim.fraudFlags && claim.fraudFlags.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm font-semibold mb-2 flex items-center gap-2 text-red-600">
                          <Shield className="h-4 w-4" />
                          Fraud Flags:
                        </div>
                        <div className="space-y-1">
                          {claim.fraudFlags.slice(0, 3).map((flag: any, idx: number) => (
                            <div key={idx} className="text-sm text-gray-700 bg-red-50 p-2 rounded">
                              "{flag.sentence}"
                            </div>
                          ))}
                          {claim.fraudFlags.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{claim.fraudFlags.length - 3} more flags
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Link href={`/claims/${claim.id}`}>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </Link>
                      {claim.reportUrl && (
                        <Button size="sm" variant="outline" className="gap-2">
                          <Download className="h-4 w-4" />
                          Download Report
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
