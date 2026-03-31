import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Search, FileText, Eye, MousePointerClick } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

/**
 * SEO Performance Dashboard
 * Track rankings, traffic, and content performance
 */
export default function SEODashboard() {
  const { data: blogStats } = trpc.blog.getAll.useQuery({ limit: 1000, offset: 0 });
  
  // Calculate stats
  const totalArticles = blogStats?.length || 0;
  const publishedArticles = blogStats?.filter(post => post.isPublished).length || 0;
  const totalViews = blogStats?.reduce((sum, post) => sum + (post.views || 0), 0) || 0;
  const avgViews = publishedArticles > 0 ? Math.round(totalViews / publishedArticles) : 0;
  
  // Top performing articles
  const topArticles = blogStats
    ?.filter(post => post.isPublished)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10) || [];
  
  // Category breakdown
  const categoryStats = blogStats?.reduce((acc, post) => {
    const category = post.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { count: 0, views: 0 };
    }
    acc[category].count++;
    acc[category].views += post.views || 0;
    return acc;
  }, {} as Record<string, { count: number; views: number }>) || {};
  
  const categories = Object.entries(categoryStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.views - a.views);

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">SEO Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Track your content performance and SEO metrics across all published articles
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArticles}</div>
              <p className="text-xs text-muted-foreground">
                {publishedArticles} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {avgViews} avg per article
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Target Keywords</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{publishedArticles * 3}</div>
              <p className="text-xs text-muted-foreground">
                ~3 keywords per article
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. CTR</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.12%</div>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +0.08% from last period
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          {/* Top Performing Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Articles</CardTitle>
              <CardDescription>
                Articles ranked by total views
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArticles.length > 0 ? (
                  topArticles.map((article, index) => (
                    <div key={article.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <p className="text-sm font-medium truncate">
                            {article.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {article.category || 'General'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {article.views || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No published articles yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Category</CardTitle>
              <CardDescription>
                Content distribution and engagement by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div key={category.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{category.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {category.count} articles
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {category.views.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${totalViews > 0 ? (category.views / totalViews) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No categories yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEO Strategy Overview */}
        <Card>
          <CardHeader>
            <CardTitle>2,000,000 Keyword Strategy Progress</CardTitle>
            <CardDescription>
              Track your progress toward dominating local roofing search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Performance</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 310 keywords ranking</p>
                  <p>• 10.41K monthly impressions</p>
                  <p>• Average position: 69.82</p>
                  <p>• 13 clicks/month</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">6-Month Target</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• 10,000+ keywords ranking</p>
                  <p>• 500K+ monthly impressions</p>
                  <p>• Average position: &lt;30</p>
                  <p>• 500+ leads/month</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Content Progress</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• {publishedArticles} articles published</p>
                  <p>• {77 - (publishedArticles - 20)} cities remaining</p>
                  <p>• {Math.round((publishedArticles / 1000) * 100)}% of 1,000 article goal</p>
                  <p>• {publishedArticles * 3} keywords targeted</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {publishedArticles} / 1,000 articles
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${(publishedArticles / 1000) * 100}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
