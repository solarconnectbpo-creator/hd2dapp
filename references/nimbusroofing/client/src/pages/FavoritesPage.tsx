import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Star, 
  Copy, 
  Trash2,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Settings,
  Target,
  Briefcase,
  Shield,
  Calendar,
  MessageSquare,
  Zap,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

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

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { data: favorites, isLoading, refetch } = trpc.prompts.getFavorites.useQuery(undefined, {
    enabled: !!user,
  });
  const removeFromFavorites = trpc.prompts.removeFromFavorites.useMutation({
    onSuccess: () => {
      toast.success("Removed from favorites");
      refetch();
    },
  });
  const recordUsage = trpc.prompts.recordUsage.useMutation();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your favorites...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-6 w-6 text-yellow-500" />
              Login Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to view your favorite prompts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/prompts">
              <Button className="w-full">Browse Prompts</Button>
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
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnpNNiA0NGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6Ci8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <div className="container relative">
          <div className="max-w-3xl">
            <Badge className="bg-white/20 text-white border-white/30 mb-6 px-4 py-1">
              <Star className="h-4 w-4 mr-2 inline fill-white" />
              Your Collection
            </Badge>
            <h1 className="text-4xl md:text-5xl font-light mb-6 leading-tight">
              My Favorite Prompts
            </h1>
            <p className="text-xl text-white/90 font-light">
              Quick access to your most-used Perplexity AI prompts
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12">

        {!favorites || favorites.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No favorites yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start adding prompts to your favorites for quick access
              </p>
              <Link href="/prompts">
                <Button>Browse Prompt Library</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map(({ favorite, prompt }) => {
              const Icon = categoryIcons[prompt.category] || BookOpen;
              return (
                <FavoriteCard
                  key={favorite.id}
                  favorite={favorite}
                  prompt={prompt}
                  Icon={Icon}
                  onRemove={() =>
                    removeFromFavorites.mutate({ promptId: prompt.id })
                  }
                  onCopy={async (customValues) => {
                    await recordUsage.mutateAsync({
                      promptId: prompt.id,
                      customizationValues: customValues,
                    });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FavoriteCard({
  favorite,
  prompt,
  Icon,
  onRemove,
  onCopy,
}: {
  favorite: any;
  prompt: any;
  Icon: any;
  onRemove: () => void;
  onCopy: (customValues: Record<string, string>) => Promise<void>;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    favorite.customDefaults ? JSON.parse(favorite.customDefaults) : {}
  );

  const customizationFields = prompt.customizationFields
    ? JSON.parse(prompt.customizationFields)
    : [];

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
      await onCopy(customValues);
      toast.success("Prompt copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy prompt");
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-lg leading-tight">{prompt.title}</CardTitle>
        <CardDescription className="text-sm">
          {prompt.category.replace(/_/g, " ")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {favorite.notes && (
          <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-gray-700">
            <strong>Notes:</strong> {favorite.notes}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleCopy} className="flex-1 gap-2" size="sm">
            <Copy className="h-4 w-4" />
            Copy Prompt
          </Button>
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
            {customizationFields.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Customize:</h4>
                <div className="space-y-2">
                  {customizationFields.map((field: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">
                        {field.label}
                      </label>
                      <Input
                        type={field.type || "text"}
                        placeholder={field.placeholder || field.default}
                        value={customValues[field.name] || field.default || ""}
                        onChange={(e) =>
                          setCustomValues({
                            ...customValues,
                            [field.name]: e.target.value,
                          })
                        }
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
