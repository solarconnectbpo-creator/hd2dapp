import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  Star,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

export default function Admin() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated or not admin
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={() => setLocation("/")}>Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch dashboard data
  const { data: stats } = trpc.admin.getDashboardStats.useQuery();
  const { data: recentLeads } = trpc.admin.getRecentLeads.useQuery({ limit: 5 });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <img src="/nimbus-ai-logo.png" alt="Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner" className="h-8 w-8" />
                <span className="font-bold text-lg">Nimbus Admin</span>
              </Link>
              <div className="hidden md:flex items-center gap-4">
                <Link href="/admin" className="text-sm font-medium text-primary">Dashboard</Link>
                <Link href="/admin/leads" className="text-sm font-medium hover:text-primary">Leads</Link>
                <Link href="/admin/projects" className="text-sm font-medium hover:text-primary">Projects</Link>
                <Link href="/admin/ai-content" className="text-sm font-medium hover:text-primary">AI Content</Link>
                <Link href="/admin/weather" className="text-sm font-medium hover:text-primary">Weather Monitor</Link>
                <Link href="/admin/notifications" className="text-sm font-medium hover:text-primary">Notifications</Link>
                <Link href="/admin/content-scaling" className="text-sm font-medium hover:text-primary">Content Scaling</Link>
                <Link href="/admin/seo-dashboard" className="text-sm font-medium hover:text-primary">SEO Dashboard</Link>
                <Link href="/automation" className="text-sm font-medium hover:text-primary text-purple-600">🚀 IQ AI Platform</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
              <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
                View Site
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}. Here's what's happening with Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
                  <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
                  <p className="text-xs text-green-600 mt-1">+{stats?.newLeadsThisWeek || 0} this week</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Projects</p>
                  <p className="text-3xl font-bold">{stats?.activeProjects || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats?.completedThisMonth || 0} completed this month</p>
                </div>
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Briefcase className="h-6 w-6 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Chat Conversations</p>
                  <p className="text-3xl font-bold">{stats?.chatConversations || 0}</p>
                  <p className="text-xs text-purple-600 mt-1">{stats?.activeChats || 0} active now</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Revenue (MTD)</p>
                  <p className="text-3xl font-bold">${((stats?.revenueThisMonth || 0) / 100).toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">
                    <TrendingUp className="h-3 w-3 inline mr-1" />
                    +{stats?.revenueGrowth || 0}% vs last month
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Leads */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Leads</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setLocation("/admin/leads")}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!recentLeads || recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No leads yet. They'll appear here when customers contact you.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead: any) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{lead.name}</h3>
                          <Badge variant={
                            lead.urgency === "emergency" ? "destructive" :
                            lead.urgency === "high" ? "default" :
                            "secondary"
                          }>
                            {lead.urgency}
                          </Badge>
                          <Badge variant="outline">{lead.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <span>{lead.email}</span>
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}
                          {lead.city && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{lead.city}</span>
                            </div>
                          )}
                        </div>
                        {lead.serviceType && (
                          <p className="text-sm mt-1">
                            <span className="font-medium">Service:</span> {lead.serviceType}
                          </p>
                        )}
                        {lead.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{lead.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/admin/leads")}>
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-bold mb-2">Manage Leads</h3>
              <p className="text-sm text-muted-foreground">View and manage all customer inquiries and leads</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/admin/projects")}>
            <CardContent className="p-6">
              <Briefcase className="h-8 w-8 text-secondary mb-3" />
              <h3 className="font-bold mb-2">Track Projects</h3>
              <p className="text-sm text-muted-foreground">Monitor ongoing roofing projects and timelines</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/admin/content")}>
            <CardContent className="p-6">
              <Star className="h-8 w-8 text-yellow-500 mb-3" />
              <h3 className="font-bold mb-2">Manage Content</h3>
              <p className="text-sm text-muted-foreground">Update testimonials, blog posts, and SEO content</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
