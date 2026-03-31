import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  Zap,
  Phone,
  Mail,
  Calendar,
  FileText,
  AlertTriangle,
  Users,
  BarChart3,
  Shield,
  Wrench,
  CloudRain,
  DollarSign,
  Camera,
  Truck,
  ClipboardCheck,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  Star,
  Sparkles,
  Search,
  Bot,
} from "lucide-react";

type Category =
  | "suggested"
  | "leads"
  | "claims"
  | "operations"
  | "marketing"
  | "compliance";

interface Automation {
  title: string;
  description: string;
  icon: any;
  category: Category;
  trigger: string;
  popular?: boolean;
}

const automations: Automation[] = [
  // Suggested for Roofing
  {
    title: "Notify crew when emergency lead comes in",
    description: "Instantly alert your nearest crew when a high-urgency storm damage lead is created",
    icon: AlertTriangle,
    category: "suggested",
    trigger: "Lead urgency = emergency",
    popular: true,
  },
  {
    title: "Send follow-up email 1 day after inspection",
    description: "Automatically email the homeowner with inspection results and next steps",
    icon: Mail,
    category: "suggested",
    trigger: "1 day after inspection date",
    popular: true,
  },
  {
    title: "Update lead to 'Lost' if no contact after 14 days",
    description: "Auto-close stale leads that haven't been contacted in two weeks",
    icon: Users,
    category: "suggested",
    trigger: "No activity for 14 days",
  },
  {
    title: "Collect email before ending AI call",
    description: "AI agent always asks for email address before concluding any customer conversation",
    icon: Mail,
    category: "suggested",
    trigger: "Every AI call conclusion",
    popular: true,
  },

  // Lead Management
  {
    title: "Auto-assign leads by zip code",
    description: "Route new leads to the correct sales rep based on service area zip codes",
    icon: Users,
    category: "leads",
    trigger: "New lead created",
  },
  {
    title: "Send instant SMS confirmation to new leads",
    description: "Text the homeowner within 30 seconds of their inquiry with appointment confirmation",
    icon: Phone,
    category: "leads",
    trigger: "New lead created",
    popular: true,
  },
  {
    title: "Escalate if lead uncontacted after 2 hours",
    description: "Alert the sales manager if a new lead hasn't been called within 2 hours",
    icon: AlertTriangle,
    category: "leads",
    trigger: "2 hours after lead creation",
  },
  {
    title: "Weekly digest of leads by source",
    description: "Send Monday morning summary of all leads grouped by source (AI, web, referral, storm)",
    icon: BarChart3,
    category: "leads",
    trigger: "Every Monday 8:00 AM",
  },
  {
    title: "Score leads by storm proximity",
    description: "Auto-prioritize leads from zip codes within 10 miles of recent hail/wind events",
    icon: CloudRain,
    category: "leads",
    trigger: "Weather alert + new lead",
  },
  {
    title: "Notify sales when lead crosses MQL threshold",
    description: "Alert the team when a lead's engagement score indicates they're ready to buy",
    icon: Star,
    category: "leads",
    trigger: "Lead score > threshold",
  },

  // Insurance Claims
  {
    title: "Auto-generate Xactimate scope sheet",
    description: "Create a pre-filled scope sheet when inspection photos are uploaded to a claim",
    icon: FileText,
    category: "claims",
    trigger: "Photos uploaded to claim",
    popular: true,
  },
  {
    title: "Notify adjuster when supplement is ready",
    description: "Email the insurance adjuster when the AI supplement document is finalized",
    icon: Mail,
    category: "claims",
    trigger: "Supplement status = ready",
  },
  {
    title: "Escalate if claim stalled 7+ days",
    description: "Alert the claims manager if an open claim has no activity for a week",
    icon: AlertTriangle,
    category: "claims",
    trigger: "No activity for 7 days",
  },
  {
    title: "Track depreciation recovery deadlines",
    description: "Send reminders 30, 14, and 7 days before depreciation recovery window closes",
    icon: DollarSign,
    category: "claims",
    trigger: "Days before deadline",
  },
  {
    title: "AI audit estimate against building codes",
    description: "Run Nimbus iQ sovereign audit on every new insurance estimate for missing line items",
    icon: Shield,
    category: "claims",
    trigger: "New estimate uploaded",
    popular: true,
  },
  {
    title: "Daily digest of open claims by status",
    description: "Morning summary of all active claims grouped by stage (filed, supplement, approved, paid)",
    icon: ClipboardCheck,
    category: "claims",
    trigger: "Every day 7:00 AM",
  },

  // Operations
  {
    title: "Schedule crew based on weather forecast",
    description: "Auto-reschedule outdoor jobs when rain probability exceeds 60% for the day",
    icon: CloudRain,
    category: "operations",
    trigger: "Weather forecast update",
  },
  {
    title: "Notify homeowner day before installation",
    description: "Send SMS and email reminder to the customer 24 hours before their roof installation",
    icon: Calendar,
    category: "operations",
    trigger: "1 day before install date",
    popular: true,
  },
  {
    title: "Track material delivery status",
    description: "Notify project manager when materials are shipped, delivered, or delayed",
    icon: Truck,
    category: "operations",
    trigger: "Delivery status change",
  },
  {
    title: "Auto-upload CompanyCam photos to project",
    description: "Sync inspection and progress photos from CompanyCam to the project record automatically",
    icon: Camera,
    category: "operations",
    trigger: "New photo in CompanyCam",
  },
  {
    title: "Generate Certificate of Completion",
    description: "Auto-create and email the COC to the insurance company when job status changes to 'Complete'",
    icon: ClipboardCheck,
    category: "operations",
    trigger: "Job status = complete",
  },
  {
    title: "Weekly crew performance report",
    description: "AI-generated summary of jobs completed, quality scores, and customer ratings per crew",
    icon: BarChart3,
    category: "operations",
    trigger: "Every Friday 5:00 PM",
  },

  // Marketing
  {
    title: "Post storm alert to social media",
    description: "Auto-publish a storm damage awareness post when severe weather hits your service area",
    icon: CloudRain,
    category: "marketing",
    trigger: "Severe weather alert",
    popular: true,
  },
  {
    title: "Generate SEO blog post weekly",
    description: "AI writes and publishes a roofing-focused blog post targeting local keywords every week",
    icon: FileText,
    category: "marketing",
    trigger: "Every Monday 10:00 AM",
  },
  {
    title: "Send review request after job completion",
    description: "Email and text the customer asking for a Google review 3 days after job completion",
    icon: Star,
    category: "marketing",
    trigger: "3 days after job complete",
  },
  {
    title: "Drip campaign for unconverted leads",
    description: "Send a 5-email nurture sequence to leads who got an estimate but haven't signed",
    icon: Mail,
    category: "marketing",
    trigger: "Lead status = quoted, no sign after 3 days",
  },
  {
    title: "Seasonal maintenance reminder campaign",
    description: "Email past customers with seasonal roof maintenance tips and inspection offers",
    icon: Calendar,
    category: "marketing",
    trigger: "Quarterly schedule",
  },
  {
    title: "Referral reward notification",
    description: "Notify the referrer and send a thank-you gift card when their referral converts",
    icon: DollarSign,
    category: "marketing",
    trigger: "Referred lead converts",
  },

  // Compliance
  {
    title: "Verify contractor licenses before job start",
    description: "Auto-check that all crew certifications are current before a job is scheduled",
    icon: Shield,
    category: "compliance",
    trigger: "Job scheduled",
  },
  {
    title: "Building code update alerts",
    description: "Notify the team when IRC/IBC building codes change for your service area jurisdictions",
    icon: FileText,
    category: "compliance",
    trigger: "Code database update",
  },
  {
    title: "OSHA safety checklist before each job",
    description: "Send mandatory safety checklist to crew lead that must be completed before work begins",
    icon: ClipboardCheck,
    category: "compliance",
    trigger: "Day of scheduled job",
  },
  {
    title: "Warranty registration automation",
    description: "Auto-register manufacturer warranty when installation is marked complete with photos",
    icon: Shield,
    category: "compliance",
    trigger: "Job status = complete + photos uploaded",
  },
];

const categories: { key: Category; label: string; icon: any }[] = [
  { key: "suggested", label: "Suggested for You", icon: Sparkles },
  { key: "leads", label: "Lead Management", icon: Users },
  { key: "claims", label: "Insurance Claims", icon: FileText },
  { key: "operations", label: "Operations", icon: Wrench },
  { key: "marketing", label: "Marketing", icon: BarChart3 },
  { key: "compliance", label: "Compliance & Safety", icon: Shield },
];

export default function AutomationsCatalog() {
  const [activeCategory, setActiveCategory] = useState<Category>("suggested");
  const [searchQuery, setSearchQuery] = useState("");
  const [email, setEmail] = useState("");

  const filtered = automations.filter((a) => {
    const matchesCategory = activeCategory === "suggested" ? a.category === "suggested" : a.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleActivate = (title: string) => {
    toast.success(`"${title}" automation activated! Configure it in your dashboard.`);
  };

  const handleGetStarted = () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    toast.success("Welcome! Check your email for setup instructions.");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-gray-900 text-white py-4 sticky top-0 z-50">
        <div className="container flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img
                src="/nimbus-logo-final.png"
                alt="Nimbus Roofing"
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <span className="font-bold text-lg">Nimbus Roofing</span>
                <span className="text-cyan-400 text-xs block">Automations</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/voice-ai">
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Voice AI
              </Button>
            </Link>
            <Link href="/ai-voice-pricing">
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Pricing
              </Button>
            </Link>
            <Link href="/">
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="container text-center max-w-3xl">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-4 text-sm px-4 py-1">
            <Zap className="w-3 h-3 mr-1 inline" /> Powered by Make.com + Nimbus AI
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Automations Catalog
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            Choose from ready-made automations that Nimbus AI will set up for you.
            Built specifically for roofing contractors, insurance claims, and field operations.
          </p>
          <div className="flex items-center bg-white/10 rounded-xl px-4 py-2 max-w-lg mx-auto">
            <Search className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
            <Input
              type="text"
              placeholder="Search automations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-white placeholder:text-gray-400 focus-visible:ring-0 px-0"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12">
        <div className="container">
          <div className="flex gap-8">
            {/* Sidebar Categories */}
            <div className="w-64 flex-shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                  Categories
                </h3>
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeCategory === cat.key
                        ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <cat.icon className="w-4 h-4 flex-shrink-0" />
                    {cat.label}
                    <span className="ml-auto text-xs text-gray-400">
                      {automations.filter((a) => a.category === cat.key).length}
                    </span>
                  </button>
                ))}

                {/* Sidebar CTA */}
                <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <Bot className="w-8 h-8 text-cyan-500 mb-2" />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    Need a Custom Automation?
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Our AI team can build custom workflows for your specific needs.
                  </p>
                  <Button size="sm" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">
                    <a href="tel:2146126696">Request Custom</a>
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Category Tabs */}
            <div className="lg:hidden w-full">
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                      activeCategory === cat.key
                        ? "bg-cyan-500 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Automations Grid */}
            <div className="flex-1">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {categories.find((c) => c.key === activeCategory)?.label}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {filtered.length} automation{filtered.length !== 1 ? "s" : ""} available
                  </p>
                </div>
              </div>

              {/* Suggested Banner */}
              {activeCategory === "suggested" && (
                <Card className="mb-6 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Recommended for Nimbus Roofing
                      </h3>
                      <p className="text-sm text-gray-600">
                        These automations are pre-configured for roofing contractors. Activate with
                        one click.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Automation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((automation, i) => (
                  <Card
                    key={i}
                    className="border border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all group"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                          <automation.icon className="w-5 h-5 text-gray-600 group-hover:text-cyan-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                              {automation.title}
                            </h3>
                            {automation.popular && (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs flex-shrink-0">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                            {automation.description}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {automation.trigger}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 text-xs h-7 px-2"
                              onClick={() => handleActivate(automation.title)}
                            >
                              Activate <ChevronRight className="w-3 h-3 ml-0.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No automations found
                  </h3>
                  <p className="text-gray-500">
                    Try a different search term or browse another category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="py-16 bg-gray-50">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Connects With Your Existing Tools
          </h2>
          <p className="text-gray-600 mb-8">
            7,000+ integrations via Make.com, Zapier, and native connectors
          </p>
          <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
            {[
              "Google Calendar",
              "Gmail",
              "Slack",
              "CompanyCam",
              "QuickBooks",
              "Xactimate",
              "Twilio",
              "Make.com",
              "Zapier",
              "Google Drive",
              "Stripe",
              "HubSpot",
            ].map((tool, i) => (
              <div
                key={i}
                className="px-4 py-2 bg-white rounded-lg border border-gray-200 text-sm text-gray-700 font-medium"
              >
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">
            Automate Your Roofing Business Today
          </h2>
          <p className="text-gray-300 mb-8">
            Start with our recommended automations and add more as you grow. All included in your
            $49.99/month plan.
          </p>
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto mb-4">
            <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              onKeyDown={(e) => e.key === "Enter" && handleGetStarted()}
            />
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 whitespace-nowrap"
              onClick={handleGetStarted}
            >
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>30+ roofing automations</span>
            <span>&middot;</span>
            <span>One-click activation</span>
            <span>&middot;</span>
            <span>No coding required</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
        <div className="container text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Nimbus Roofing. All rights reserved.</p>
          <p className="mt-1">McKinney, TX &middot; (214) 612-6696 &middot; nimbusroofing.com</p>
        </div>
      </footer>
    </div>
  );
}
