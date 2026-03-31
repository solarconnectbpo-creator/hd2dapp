import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Copy, 
  Star, 
  TrendingUp, 
  Filter,
  Sparkles,
  BookOpen,
  Target,
  Zap,
  Shield,
  Calendar,
  Briefcase,
  MessageSquare,
  AlertCircle,
  Settings
} from "lucide-react";
import { toast } from "sonner";

// Category icons mapping
const categoryIcons: Record<string, any> = {
  storm_intelligence: AlertCircle,
  market_research: TrendingUp,
  product_research: Settings,
  seo_marketing: Target,
  lead_management: Briefcase,
  insurance_claims: Shield,
  business_strategy: Calendar,
  sales_support: MessageSquare,
  emergency_operations: Zap,
  technology_research: Sparkles,
};

// Category display names
const categoryNames: Record<string, string> = {
  storm_intelligence: "Storm Intelligence",
  market_research: "Market Research",
  product_research: "Product Research",
  seo_marketing: "SEO & Marketing",
  lead_management: "Lead Management",
  insurance_claims: "Insurance Claims",
  business_strategy: "Business Strategy",
  sales_support: "Sales Support",
  emergency_operations: "Emergency Operations",
  technology_research: "Technology Research",
};

export default function PromptLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFeatured, setShowFeatured] = useState(false);

  // Fetch all prompts
  const { data: prompts, isLoading } = trpc.prompts.getAll.useQuery({
    category: selectedCategory || undefined,
    searchQuery: searchQuery || undefined,
    isFeatured: showFeatured || undefined,
    isActive: true,
  });

  // Fetch categories with counts
  const { data: categories } = trpc.prompts.getCategories.useQuery();

  // Filtered prompts based on search
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    return prompts;
  }, [prompts]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      <main className="flex-1">
        {/* Hero Section - Material Design */}
        <section className="bg-gradient-to-br from-primary via-primary/90 to-accent text-white py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiA0NGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Badge className="bg-white/20 text-white border-white/30 mb-6 px-4 py-1">
                <Sparkles className="h-4 w-4 mr-2 inline" />
                Perplexity AI Prompt Library
              </Badge>
              <h1 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
                AI-Powered Research Prompts for Roofing Professionals
              </h1>
              <p className="text-xl text-white/90 mb-8 font-light">
                10 battle-tested Perplexity AI prompts to accelerate your daily tasks - from storm damage research to competitor analysis
              </p>
              
              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search prompts by keyword, category, or use case..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg bg-white text-gray-900 border-0 shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="py-8 border-b bg-white">
          <div className="container">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-700">Filter by category:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </Button>
                {categories?.map((cat) => {
                  const Icon = categoryIcons[cat.category] || BookOpen;
                  return (
                    <Button
                      key={cat.category}
                      variant={selectedCategory === cat.category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.category)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {categoryNames[cat.category] || cat.category}
                      <Badge variant="secondary" className="ml-1">
                        {cat.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              <Button
                variant={showFeatured ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFeatured(!showFeatured)}
                className="gap-2"
              >
                <Star className="h-4 w-4" />
                Featured Only
              </Button>
            </div>
          </div>
        </section>

        {/* Prompts Grid */}
        <section className="py-12">
          <div className="container">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No prompts found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrompts.map((prompt) => {
                  const Icon = categoryIcons[prompt.category] || BookOpen;
                  return (
                    <PromptCard key={prompt.id} prompt={prompt} Icon={Icon} />
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {prompts?.length || 0}
                </div>
                <div className="text-gray-600">Total Prompts</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {categories?.length || 0}
                </div>
                <div className="text-gray-600">Categories</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {prompts?.reduce((sum, p) => sum + (p.usageCount || 0), 0) || 0}
                </div>
                <div className="text-gray-600">Total Uses</div>
              </div>
            </div>
          </div>
        </section>

        {/* How to Use Section */}
        <section className="py-16">
          <div className="container max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">How to Use These Prompts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">1</span>
                    Find Your Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Browse by category or search for specific tasks. Each prompt is optimized for Perplexity AI.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">2</span>
                    Customize Fields
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Click "View Details" to see customization fields. Fill in your specific details (addresses, dates, etc.).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">3</span>
                    Copy to Perplexity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Click "Copy Prompt" and paste into Perplexity AI. Use Perplexity Pro for best results.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">4</span>
                    Save Favorites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Star your most-used prompts for quick access. Track usage and save custom defaults.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Prompt Card Component
function PromptCard({ prompt, Icon }: { prompt: any; Icon: any }) {
  const [showDetails, setShowDetails] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const { user } = useAuth();
  const { data: isFavorited, refetch: refetchFavorite } = trpc.prompts.isFavorited.useQuery(
    { promptId: prompt.id },
    { enabled: !!user }
  );
  const recordUsage = trpc.prompts.recordUsage.useMutation();
  const addToFavorites = trpc.prompts.addToFavorites.useMutation({
    onSuccess: () => {
      toast.success("Added to favorites!");
      refetchFavorite();
    },
  });
  const removeFromFavorites = trpc.prompts.removeFromFavorites.useMutation({
    onSuccess: () => {
      toast.success("Removed from favorites");
      refetchFavorite();
    },
  });

  // Initialize custom values with defaults
  const customizationFields = prompt.customizationFields
    ? JSON.parse(prompt.customizationFields)
    : [];

  // Build prompt with custom values
  const buildCustomizedPrompt = () => {
    let customized = prompt.promptText;
    customizationFields.forEach((field: any) => {
      const value = customValues[field.name] || field.default || `[${field.name}]`;
      customized = customized.replaceAll(`[${field.name}]`, value);
    });
    return customized;
  };

  const handleCopy = async () => {
    try {
      const customizedPrompt = buildCustomizedPrompt();
      await navigator.clipboard.writeText(customizedPrompt);
      await recordUsage.mutateAsync({ 
        promptId: prompt.id,
        customizationValues: customValues
      });
      toast.success("Customized prompt copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            {prompt.isFeatured && (
              <Badge variant="default" className="gap-1">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {prompt.usageCount || 0} uses
          </Badge>
        </div>
        <CardTitle className="text-lg leading-tight">{prompt.title}</CardTitle>
        <CardDescription className="text-sm">
          {categoryNames[prompt.category] || prompt.category}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          <strong>Use Case:</strong> {prompt.useCase}
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            className="flex-1 gap-2"
            size="sm"
          >
            <Copy className="h-4 w-4" />
            Copy Prompt
          </Button>
          {user && (
            <Button
              onClick={() => {
                if (isFavorited) {
                  removeFromFavorites.mutate({ promptId: prompt.id });
                } else {
                  addToFavorites.mutate({ promptId: prompt.id });
                }
              }}
              variant={isFavorited ? "default" : "outline"}
              size="sm"
              className="gap-1"
            >
              <Star className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
            </Button>
          )}
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            size="sm"
          >
            {showDetails ? "Hide" : "Details"}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-2">Full Prompt:</h4>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {prompt.promptText}
              </pre>
            </div>
            
            {customizationFields.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Customize Your Prompt:</h4>
                <div className="space-y-3">
                  {customizationFields.map((field: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          placeholder={field.placeholder || field.default || `Enter ${field.label.toLowerCase()}`}
                          value={customValues[field.name] || field.default || ""}
                          onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                          className="w-full text-xs border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={2}
                        />
                      ) : field.type === "select" ? (
                        <select
                          value={customValues[field.name] || field.default || ""}
                          onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                          className="w-full text-xs border rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={field.type || "text"}
                          placeholder={field.placeholder || field.default || `Enter ${field.label.toLowerCase()}`}
                          value={customValues[field.name] || field.default || ""}
                          onChange={(e) => setCustomValues({ ...customValues, [field.name]: e.target.value })}
                          className="text-xs h-8"
                        />
                      )}
                      {field.default && !customValues[field.name] && (
                        <p className="text-xs text-gray-500">Default: {field.default}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  💡 Tip: Fill in the fields above, then click "Copy Prompt" to get your customized version!
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
