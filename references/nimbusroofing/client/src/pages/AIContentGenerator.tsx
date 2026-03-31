import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, FileText, Image as ImageIcon, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function AIContentGenerator() {
  const [topic, setTopic] = useState("");
  const [geoTarget, setGeoTarget] = useState("McKinney, Texas");
  const [keywords, setKeywords] = useState("");
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMutation = trpc.blog.generateContent.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      setIsGenerating(false);
      toast.success("Content generated successfully!");
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Failed to generate content: ${error.message}`);
    },
  });

  const createBlogMutation = trpc.blog.create.useMutation({
    onSuccess: () => {
      toast.success("Blog post created successfully!");
      setGeneratedContent(null);
      setTopic("");
      setKeywords("");
    },
    onError: (error) => {
      toast.error(`Failed to create blog post: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    const keywordArray = keywords
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    generateMutation.mutate({
      topic: topic.trim(),
      geoTarget: geoTarget.trim() || undefined,
      keywords: keywordArray.length > 0 ? keywordArray : undefined,
    });
  };

  const handleSaveAsDraft = () => {
    if (!generatedContent) return;

    const slug = generatedContent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    createBlogMutation.mutate({
      title: generatedContent.title,
      slug,
      excerpt: generatedContent.excerpt,
      content: generatedContent.content,
      featuredImage: generatedContent.visualUrl,
      keywords: generatedContent.keywords.join(", "),
      metaTitle: generatedContent.title,
      metaDescription: generatedContent.excerpt,
      isPublished: false,
    });
  };

  const handlePublish = () => {
    if (!generatedContent) return;

    const slug = generatedContent.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    createBlogMutation.mutate({
      title: generatedContent.title,
      slug,
      excerpt: generatedContent.excerpt,
      content: generatedContent.content,
      featuredImage: generatedContent.visualUrl,
      keywords: generatedContent.keywords.join(", "),
      metaTitle: generatedContent.title,
      metaDescription: generatedContent.excerpt,
      isPublished: true,
    });
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          Nimbus SEO Agent Pro
        </h1>
        <p className="text-muted-foreground">
          AI-powered content generation system targeting millions of keywords with proprietary business data
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Content Generation Settings</CardTitle>
            <CardDescription>
              Configure your AI-powered SEO content generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic *</Label>
              <Input
                id="topic"
                placeholder="e.g., Storm Damage Roof Repair After Hail"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Enter the main topic for your blog article
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geoTarget">Geographic Target</Label>
              <Input
                id="geoTarget"
                placeholder="McKinney, Texas"
                value={geoTarget}
                onChange={(e) => setGeoTarget(e.target.value)}
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Target location for local SEO optimization
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Target Keywords (Optional)</Label>
              <Textarea
                id="keywords"
                placeholder="hail damage roof repair, storm damage restoration, insurance claim assistance"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                disabled={isGenerating}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated keywords. AI will add relevant keywords automatically.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate SEO Content
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">AI is working on:</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Retrieving proprietary knowledge base</li>
                  <li>✓ Selecting high-value keywords</li>
                  <li>✓ Generating semantic content</li>
                  <li>✓ Creating visual assets</li>
                  <li>✓ Optimizing for SEO</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats & Templates</CardTitle>
            <CardDescription>
              Popular content templates and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold text-primary">3M+</div>
                <div className="text-xs text-muted-foreground">Target Keywords</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-2xl font-bold text-primary">$4.2K</div>
                <div className="text-xs text-muted-foreground">Avg Supplement Value</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Popular Templates</Label>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setTopic("Storm Damage Roof Repair After Hail in McKinney")}
                  disabled={isGenerating}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Storm Damage Template
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setTopic("Maximizing Your Roof Insurance Claim in Texas")}
                  disabled={isGenerating}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Insurance Claims Template
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setTopic("Best Impact Resistant Shingles for Texas Weather")}
                  disabled={isGenerating}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Materials & Products Template
                </Button>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <p className="text-sm font-medium mb-2">💡 Pro Tip</p>
              <p className="text-xs text-muted-foreground">
                The AI uses proprietary Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner data including average supplement values,
                measurement techniques, and Texas deductible law compliance to create authoritative content.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generated Content Display */}
      {generatedContent && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{generatedContent.title}</CardTitle>
                <CardDescription>{generatedContent.excerpt}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveAsDraft}
                  disabled={createBlogMutation.isPending}
                >
                  Save as Draft
                </Button>
                <Button onClick={handlePublish} disabled={createBlogMutation.isPending}>
                  {createBlogMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Now"
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Word Count</div>
                <div className="text-2xl font-bold">{generatedContent.metadata.wordCount}</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Reading Time</div>
                <div className="text-2xl font-bold">{generatedContent.metadata.readingTime} min</div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">SEO Score</div>
                <div className="text-2xl font-bold text-green-600">
                  {generatedContent.metadata.seoScore}/100
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label className="mb-2 block">Target Keywords</Label>
              <div className="flex flex-wrap gap-2">
                {generatedContent.keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Featured Image */}
            {generatedContent.visualUrl && (
              <div>
                <Label className="mb-2 block">Featured Image (AI Generated)</Label>
                <img
                  src={generatedContent.visualUrl}
                  alt={generatedContent.title}
                  className="w-full max-w-2xl rounded-lg border"
                />
              </div>
            )}

            {/* Content Preview */}
            <div>
              <Label className="mb-2 block">Content Preview</Label>
              <div className="prose prose-sm max-w-none bg-muted p-6 rounded-lg">
                <Streamdown>{generatedContent.content}</Streamdown>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
