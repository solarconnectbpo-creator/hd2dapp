import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, TrendingUp, Link2, Search, BarChart3, Target } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { toast } from 'sonner';

export default function BacklinkDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [sortBy, setSortBy] = useState<'da-desc' | 'da-asc' | 'status'>('da-desc');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const utils = trpc.useUtils();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch backlinks data
  const { data: backlinks, isLoading } = trpc.seo.getBacklinks.useQuery();

  // Mutation to refresh all DA scores
  const refreshAllDA = trpc.seo.refreshAllDomainAuthority.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || 'Domain Authority scores updated successfully!');
      utils.seo.getBacklinks.invalidate();
      setIsRefreshing(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to refresh Domain Authority scores');
      setIsRefreshing(false);
    },
  });

  // Mutation to check all links
  const checkAllLinks = trpc.seo.checkAllLinks.useMutation({
    onSuccess: (data) => {
      toast.success(`Link check complete! ${data.active} active, ${data.broken} broken, ${data.updated} updated`);
      utils.seo.getBacklinks.invalidate();
      setIsCheckingLinks(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to check links');
      setIsCheckingLinks(false);
    },
  });

  // Handle refresh all DA
  const handleRefreshAll = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    refreshAllDA.mutate();
  };

  // Handle check all links
  const handleCheckAllLinks = () => {
    if (isCheckingLinks) return;
    setIsCheckingLinks(true);
    checkAllLinks.mutate();
  };

  // Get unique platforms for filtering
  const platforms = Array.from(new Set(backlinks?.map(b => b.platform).filter(Boolean) || []));

  // Filter and sort backlinks
  const filteredBacklinks = backlinks
    ?.filter(b => {
      // Search filter
      const matchesSearch = !searchTerm || 
        extractDomain(b.sourceUrl || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.anchorText?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Platform filter
      const matchesPlatform = filterPlatform === 'all' || b.platform === filterPlatform;
      
      return matchesSearch && matchesPlatform;
    })
    .sort((a, b) => {
      if (sortBy === 'da-desc') {
        return (b.domainAuthority || 0) - (a.domainAuthority || 0);
      } else if (sortBy === 'da-asc') {
        return (a.domainAuthority || 0) - (b.domainAuthority || 0);
      } else if (sortBy === 'status') {
        const statusOrder = { active: 0, pending: 1, broken: 2, removed: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return 0;
    }) || [];

  // Helper function to extract domain from URL
  const extractDomain = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      // If URL parsing fails, decode and return as-is
      try {
        return decodeURIComponent(url);
      } catch {
        return url;
      }
    }
  };

  // Calculate statistics
  const totalBacklinks = backlinks?.length || 0;
  const trueBacklinks = backlinks?.filter(b => b.status === 'active').length || 0;
  const opportunities = backlinks?.filter(b => b.status === 'pending').length || 0;
  const avgDomainAuthority = backlinks?.length 
    ? Math.round(backlinks.reduce((sum, b) => sum + (b.domainAuthority || 0), 0) / backlinks.length)
    : 0;

  // Domain authority distribution
  const daRanges = [
    { range: '0-20', count: 0, color: 'bg-red-500' },
    { range: '21-40', count: 0, color: 'bg-orange-500' },
    { range: '41-60', count: 0, color: 'bg-yellow-500' },
    { range: '61-80', count: 0, color: 'bg-blue-500' },
    { range: '81-100', count: 0, color: 'bg-green-500' },
  ];

  backlinks?.forEach(b => {
    const da = b.domainAuthority || 0;
    if (da <= 20) daRanges[0].count++;
    else if (da <= 40) daRanges[1].count++;
    else if (da <= 60) daRanges[2].count++;
    else if (da <= 80) daRanges[3].count++;
    else daRanges[4].count++;
  });

  // Anchor text distribution
  const anchorTextMap = new Map<string, number>();
  backlinks?.forEach(b => {
    if (b.anchorText) {
      anchorTextMap.set(b.anchorText, (anchorTextMap.get(b.anchorText) || 0) + 1);
    }
  });
  const topAnchorTexts = Array.from(anchorTextMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top referring domains
  const domainMap = new Map<string, { count: number; da: number }>();
  backlinks?.forEach(b => {
    const domain = extractDomain(b.sourceUrl);
    if (domain) {
      const existing = domainMap.get(domain) || { count: 0, da: b.domainAuthority || 0 };
      domainMap.set(domain, { count: existing.count + 1, da: Math.max(existing.da, b.domainAuthority || 0) });
    }
  });
  const topDomains = Array.from(domainMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  // Note: filteredBacklinks is now defined earlier with advanced sorting and platform filtering

  return (
    <DashboardLayout>
      <div className="container py-8">
        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Backlink Tracking Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your backlink profile, domain authority, and link building opportunities
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCheckAllLinks}
              disabled={isCheckingLinks}
              size="lg"
              variant="outline"
              className="gap-2"
            >
              {isCheckingLinks ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Checking Links...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Check All Links
                </>
              )}
            </Button>
            <Button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              size="lg"
              className="gap-2"
            >
              {isRefreshing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Refreshing DA Scores...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Refresh All DA Scores
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="da-desc">Domain Authority (Highest First)</option>
              <option value="da-asc">Domain Authority (Lowest First)</option>
              <option value="status">Status (Active First)</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Filter by Platform</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background"
            >
              <option value="all">All Platforms</option>
              <option value="Google Maps Pack">Google Maps Pack</option>
              <option value="Google My Business">Google My Business</option>
              <option value="Google Index">Google Index</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Backlinks</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBacklinks}</div>
              <p className="text-xs text-muted-foreground">
                {trueBacklinks} active + {opportunities} opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">True Backlinks</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trueBacklinks}</div>
              <p className="text-xs text-muted-foreground">
                Live links pointing to your site
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{opportunities}</div>
              <p className="text-xs text-muted-foreground">
                Potential link building targets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Domain Authority</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDomainAuthority}</div>
              <p className="text-xs text-muted-foreground">
                Average DA across all links
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="backlinks">All Backlinks</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Domain Authority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Domain Authority Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of backlinks by domain authority score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {daRanges.map((range) => (
                      <div key={range.range} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">DA {range.range}</span>
                          <span className="text-muted-foreground">{range.count} links</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className={`${range.color} h-3 rounded-full transition-all`}
                            style={{
                              width: `${totalBacklinks > 0 ? (range.count / totalBacklinks) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Anchor Texts */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Anchor Texts</CardTitle>
                  <CardDescription>
                    Most frequently used anchor text in your backlinks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topAnchorTexts.length > 0 ? (
                      topAnchorTexts.map(([text, count], index) => (
                        <div key={text} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-medium truncate max-w-[200px]">
                              {text}
                            </span>
                          </div>
                          <Badge variant="secondary">{count} links</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No anchor text data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Referring Domains */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Top Referring Domains</CardTitle>
                  <CardDescription>
                    Domains with the most backlinks to your site
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topDomains.length > 0 ? (
                      topDomains.map(([domain, data], index) => (
                        <div key={domain} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{domain}</p>
                              <p className="text-xs text-muted-foreground">DA: {data.da}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{data.count} links</Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No referring domains found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Backlinks Tab */}
          <TabsContent value="backlinks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Backlinks</CardTitle>
                    <CardDescription>
                      {filteredBacklinks.length} backlinks found
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search backlinks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredBacklinks.length > 0 ? (
                    filteredBacklinks.map((backlink) => (
                      <div
                        key={backlink.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <a
                                href={backlink.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline flex items-center gap-1"
                              >
                                {extractDomain(backlink.sourceUrl)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <Badge variant={backlink.status === 'active' ? 'default' : 'secondary'}>
                                {backlink.status === 'active' ? 'Active' : backlink.status === 'pending' ? 'Opportunity' : backlink.status}
                              </Badge>
                              {backlink.platform && (
                                <Badge variant="outline" className="text-xs">{backlink.platform}</Badge>
                              )}
                              {backlink.domainAuthority && (
                                <Badge variant="outline">DA {backlink.domainAuthority}</Badge>
                              )}
                            </div>
                            {backlink.anchorText && (
                              <p className="text-sm text-muted-foreground mb-1">
                                Anchor: <span className="font-medium">{backlink.anchorText}</span>
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              Target: {backlink.targetUrl}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No backlinks found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Link Building Opportunities</CardTitle>
                <CardDescription>
                  {opportunities} potential backlink targets to pursue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {backlinks?.filter(b => b.status === 'pending').map((backlink) => (
                    <div
                      key={backlink.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <a
                              href={backlink.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline flex items-center gap-1"
                            >
                              {extractDomain(backlink.sourceUrl)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            {backlink.platform && (
                              <Badge variant="outline" className="text-xs">{backlink.platform}</Badge>
                            )}
                            {backlink.domainAuthority && (
                              <Badge 
                                variant="outline"
                                className={
                                  backlink.domainAuthority >= 60 
                                    ? 'border-green-500 text-green-700'
                                    : backlink.domainAuthority >= 40
                                    ? 'border-yellow-500 text-yellow-700'
                                    : 'border-red-500 text-red-700'
                                }
                              >
                                DA {backlink.domainAuthority}
                              </Badge>
                            )}
                          </div>
                          {backlink.anchorText && (
                            <p className="text-sm text-muted-foreground mb-1">
                              Suggested anchor: <span className="font-medium">{backlink.anchorText}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Target page: {backlink.targetUrl}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Reach Out
                        </Button>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No opportunities found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Link Type Breakdown</CardTitle>
                  <CardDescription>
                    Distribution of active links vs opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">True Backlinks</span>
                        <span className="text-muted-foreground">{trueBacklinks} ({totalBacklinks > 0 ? Math.round((trueBacklinks / totalBacklinks) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full"
                          style={{
                            width: `${totalBacklinks > 0 ? (trueBacklinks / totalBacklinks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Opportunities</span>
                        <span className="text-muted-foreground">{opportunities} ({totalBacklinks > 0 ? Math.round((opportunities / totalBacklinks) * 100) : 0}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div
                          className="bg-blue-500 h-3 rounded-full"
                          style={{
                            width: `${totalBacklinks > 0 ? (opportunities / totalBacklinks) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Score</CardTitle>
                  <CardDescription>
                    Overall backlink profile health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold mb-2">{avgDomainAuthority}</div>
                    <p className="text-sm text-muted-foreground mb-4">Average Domain Authority</p>
                    <div className="flex justify-center gap-2">
                      <Badge 
                        variant={avgDomainAuthority >= 60 ? 'default' : 'secondary'}
                        className={avgDomainAuthority >= 60 ? 'bg-green-500' : ''}
                      >
                        {avgDomainAuthority >= 60 ? 'Excellent' : avgDomainAuthority >= 40 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
