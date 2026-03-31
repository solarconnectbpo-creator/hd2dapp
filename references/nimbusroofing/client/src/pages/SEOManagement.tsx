import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Search, FileText, BarChart3, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SEOManagement() {
  const [selectedTab, setSelectedTab] = useState('keywords');
  const [contentTopic, setContentTopic] = useState('');
  const [contentType, setContentType] = useState<'blog' | 'service_page' | 'neighborhood' | 'social' | 'email'>('blog');
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  // Fetch keywords
  const { data: keywords, isLoading: keywordsLoading } = trpc.seo.getKeywords.useQuery();

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = trpc.seo.getTemplates.useQuery();

  // Generate content mutation
  const generateContent = trpc.seo.generateContent.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success('Content generated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to generate content: ${error.message}`);
    },
  });

  const handleGenerateContent = () => {
    if (!contentTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    generateContent.mutate({
      topic: contentTopic,
      contentType,
    });
  };

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            SEO Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage keywords, generate content, and track SEO performance with AI-powered RAG system
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="keywords" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Content
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Library</CardTitle>
                <CardDescription>
                  {keywords?.length || 0} keywords imported from your SEO data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {keywordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : keywords && keywords.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-5 gap-4 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold text-sm">
                      <div>Keyword</div>
                      <div>Volume</div>
                      <div>Difficulty</div>
                      <div>Category</div>
                      <div>Status</div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto space-y-1">
                      {keywords.map((kw: any) => (
                        <div
                          key={kw.id}
                          className="grid grid-cols-5 gap-4 px-4 py-3 bg-white dark:bg-slate-900 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="font-medium">{kw.keyword}</div>
                          <div className="text-slate-600 dark:text-slate-400">
                            {kw.searchVolume || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  kw.keywordDifficulty > 70
                                    ? 'bg-red-500'
                                    : kw.keywordDifficulty > 40
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${kw.keywordDifficulty || 0}%` }}
                              />
                            </div>
                            <span className="text-sm">{kw.keywordDifficulty || 0}</span>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            {kw.category || 'General'}
                          </div>
                          <div>
                            {kw.contentGenerated ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                                <TrendingUp className="h-3 w-3" />
                                Content Created
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded text-xs font-medium">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No keywords found. Import your SEO data to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Content Generator</CardTitle>
                  <CardDescription>
                    Generate SEO-optimized content using RAG system
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      placeholder="e.g., Roof Repair in McKinney"
                      value={contentTopic}
                      onChange={(e) => setContentTopic(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select
                      value={contentType}
                      onValueChange={(value: any) => setContentType(value)}
                    >
                      <SelectTrigger id="contentType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blog">Blog Post</SelectItem>
                        <SelectItem value="service_page">Service Page</SelectItem>
                        <SelectItem value="neighborhood">Neighborhood Page</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="email">Email Campaign</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGenerateContent}
                    disabled={generateContent.isPending}
                    className="w-full"
                  >
                    {generateContent.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Content
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    AI-generated SEO-optimized content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-semibold">Title</Label>
                        <p className="text-lg font-bold mt-1">{generatedContent.title}</p>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Meta Description</Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {generatedContent.metaDescription}
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Content</Label>
                        <Textarea
                          value={generatedContent.content}
                          readOnly
                          className="mt-1 h-64"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Keywords</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {generatedContent.keywords.map((kw: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">Call to Action</Label>
                        <p className="text-sm mt-1">{generatedContent.callToAction}</p>
                      </div>

                      <Button variant="outline" className="w-full">
                        Copy to Clipboard
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                      <p>Generate content to see results here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Templates</CardTitle>
                <CardDescription>
                  {templates?.length || 0} templates imported from your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : templates && templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template: any) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                              {template.type}
                            </span>
                            <span className="text-xs text-slate-500">
                              {template.platform}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm line-clamp-3">{template.template}</p>
                          {template.keywords && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.keywords.split(',').slice(0, 3).map((kw: string, i: number) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded"
                                >
                                  {kw.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No templates found. Import your campaign data to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{keywords?.length || 0}</div>
                  <p className="text-xs text-slate-500 mt-1">Imported from SEO data</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Content Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{templates?.length || 0}</div>
                  <p className="text-xs text-slate-500 mt-1">Campaign templates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {keywords?.filter((k: any) => k.contentGenerated).length || 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">SEO-optimized pages</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
                <CardDescription>
                  Track your keyword rankings and search visibility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>Keyword tracking coming soon</p>
                  <p className="text-sm mt-2">Connect Google Search Console to track rankings</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
