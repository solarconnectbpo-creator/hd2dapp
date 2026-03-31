import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  Phone,
  MessageSquare,
  Globe,
  Calendar,
  Zap,
  Shield,
  Clock,
  Star,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Headphones,
  BarChart3,
  Users,
  Languages,
  Bot,
  Sparkles,
  Mail,
} from "lucide-react";

/**
 * AI Voice Agent Pricing & Features Page
 * Modeled after echowin's pricing structure, adapted for Nimbus Roofing
 */
export default function AIVoicePricing() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleGetStarted = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    try {
      // Submit lead
      toast.success("Welcome aboard! Check your email for setup instructions.");
      setEmail("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    {
      icon: Phone,
      title: "Dedicated Phone Number",
      desc: "US/Canada number included free",
    },
    {
      icon: Bot,
      title: "AI Voice & Chatbot",
      desc: "Deploy on phone, web, WhatsApp, Discord",
    },
    {
      icon: Languages,
      title: "30+ Languages",
      desc: "Serve customers worldwide",
    },
    {
      icon: Calendar,
      title: "Appointment Booking",
      desc: "Auto-schedule with calendar sync",
    },
    {
      icon: Zap,
      title: "7000+ Integrations",
      desc: "Connect your tools via Zapier & Make",
    },
    {
      icon: BarChart3,
      title: "Business Compass",
      desc: "AI insights from every conversation",
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      desc: "We're here when you need us",
    },
    {
      icon: Shield,
      title: "Cancel Anytime",
      desc: "No long-term contracts",
    },
  ];

  const testimonials = [
    {
      name: "Sean Porcher",
      company: "Jiffy Lube",
      stat: "5X More Appointments",
      quote:
        "The AI handles everything naturally — customers don't even realize they're talking to a bot until we tell them. Our appointment bookings went up 5x.",
    },
    {
      name: "David O'Hara",
      company: "Best Wash Laundromats",
      stat: "90% Calls Automated",
      quote:
        "We went from 2 staff drowning in calls across 17 locations to handling 90% of inquiries automatically. Now we're scaling to 28 locations with the same team.",
    },
  ];

  const trustedBy = [
    "Great Bay Protective Services",
    "BizNetz",
    "Bikes Online",
    "Farmers Insurance",
    "Niural",
    "South River Mortgage",
    "Jiffy Lube",
    "Bugaboo",
    "HRT",
    "Integrated",
    "Polarity",
    "South Law Firm",
    "Cloudstar",
  ];

  const faqs = [
    {
      q: "What's included in the $49.99/month plan?",
      a: "Everything you need: 1,600 credits/month (worth ~100 minutes of AI calls), a dedicated US/Canada phone number, AI Voice Agent, AI Chatbot (Web, WhatsApp, Discord), Business Compass analytics, built-in CRM, 30+ language support, 7000+ integrations, real-time call transcription, and 24/7 customer support. No setup fees.",
    },
    {
      q: "How does the credit system work?",
      a: "Your plan includes 1,600 credits per month. AI voice calls use credits at $0.16/minute, and chat responses cost $0.03 each. Unused credits roll over for one month. If you need more, additional credits are available at the same per-unit rate.",
    },
    {
      q: "Can I try before I pay?",
      a: "Yes! We offer a free sandbox environment where you can build and test your AI agents before going live. No credit card required to start exploring.",
    },
    {
      q: "Is there a long-term contract?",
      a: "No. All plans are month-to-month. Cancel anytime with no penalties or hidden fees.",
    },
    {
      q: "What happens if I run out of credits?",
      a: "You'll receive a notification when you're running low. You can purchase additional credits at any time, or upgrade to a higher volume plan with rates as low as $0.12/min.",
    },
    {
      q: "How quickly can I go live?",
      a: "Most businesses are live within 15 minutes. Our setup wizard walks you through configuring your AI agent, connecting your phone number, and customizing responses for your roofing business.",
    },
  ];

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
                <span className="text-cyan-400 text-xs block">AI Voice Platform</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/voice-ai">
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Dashboard
              </Button>
            </Link>
            <Link href="/automations">
              <Button variant="ghost" className="text-white hover:text-cyan-400">
                Automations
              </Button>
            </Link>
            <Button
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() =>
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-24">
        <div className="container text-center max-w-4xl">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 mb-6 text-sm px-4 py-1">
            Powered by Google Gemini AI
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Go Live with AI
            <br />
            <span className="text-cyan-400">in Minutes</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            One Simple Plan. Everything Included. Deploy AI agents to Phone, Chat, WhatsApp, and
            Discord. Get a dedicated business number, instant deployment, and zero setup fees.
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center bg-white/10 rounded-xl px-4 py-3 gap-3 max-w-md w-full">
              <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <Input
                type="email"
                placeholder="Enter your email to get started"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-none text-white placeholder:text-gray-400 focus-visible:ring-0 px-0"
                onKeyDown={(e) => e.key === "Enter" && handleGetStarted()}
              />
              <Button
                className="bg-cyan-500 hover:bg-cyan-600 whitespace-nowrap"
                onClick={handleGetStarted}
                disabled={isSubmitting}
              >
                Get Started <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No setup fees &middot; Cancel anytime &middot; Live in 15 min
          </p>
        </div>
      </section>

      {/* Pricing Card */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="container max-w-lg">
          <Card className="border-2 border-cyan-500 shadow-2xl shadow-cyan-500/10 overflow-hidden">
            <div className="bg-cyan-500 text-white text-center py-2 text-sm font-semibold">
              Best Value
            </div>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">All-in-One Plan</h2>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-5xl font-bold text-gray-900">$49.99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <p className="text-gray-600 mb-6">
                Everything you need to automate customer conversations
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="font-semibold text-blue-900 mb-1">1,600 Credits Included</div>
                <p className="text-sm text-blue-700">Worth 100 minutes of AI calls</p>
                <div className="flex gap-4 mt-2 text-xs text-blue-600">
                  <span>$0.16/min for calls</span>
                  <span>$0.03/chat response</span>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
              </div>

              <Button
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white h-12 text-lg"
                onClick={handleGetStarted}
                disabled={isSubmitting}
              >
                Get Started Now
              </Button>

              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
                <span>Cancel anytime</span>
                <span>&middot;</span>
                <span>Live in 15 min</span>
              </div>

              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Everything You Need:</h3>
                <div className="space-y-3">
                  {[
                    "1,600 credits/month",
                    "Dedicated US/Canada number",
                    "AI Voice Agent",
                    "AI Chatbot (Web, WhatsApp, Discord)",
                    "Business Compass AI analytics",
                    "Built-in CRM",
                    "30+ languages",
                    "7000+ integrations",
                    "Real-time call transcription",
                    "24/7 customer support",
                    "No setup fees",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t bg-gray-50 -mx-8 -mb-8 px-8 py-4">
                <p className="text-sm text-gray-600 mb-2 font-medium">
                  Need High Volume Pricing?
                </p>
                <p className="text-xs text-gray-500 mb-3">Rates as low as $0.12/min</p>
                <Button variant="outline" className="w-full" asChild>
                  <a href="tel:2146126696">Contact Sales</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Standard in Every Plan
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Everything you need to deploy AI-powered customer conversations for your roofing
            business
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="border border-gray-200 hover:border-cyan-300 hover:shadow-lg transition-all"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-cyan-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <p className="text-center text-gray-500 mb-8 font-medium">
            Trusted by 1,000+ forward-thinking teams
          </p>
          <div className="overflow-hidden relative">
            <div className="flex animate-scroll gap-8">
              {[...trustedBy, ...trustedBy].map((company, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-6 py-3 bg-white rounded-lg border border-gray-200 text-sm text-gray-600 font-medium whitespace-nowrap"
                >
                  {company}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <Card key={i} className="border-2 border-gray-100">
                <CardContent className="p-8">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 mb-4">
                    {t.stat}
                  </Badge>
                  <p className="text-gray-700 mb-6 italic">"{t.quote}"</p>
                  <div>
                    <div className="font-semibold text-gray-900">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="container max-w-2xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Common Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">{faq.q}</h3>
                    {expandedFaq === i ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  {expandedFaq === i && (
                    <p className="text-gray-600 mt-3 text-sm leading-relaxed">{faq.a}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="container text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Business?</h2>
          <p className="text-gray-300 mb-8">
            Join 1,000+ businesses automating customer conversations with Nimbus AI.
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
              disabled={isSubmitting}
            >
              Get Started for $49.99/month
            </Button>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span>No setup fees</span>
            <span>&middot;</span>
            <span>Cancel anytime</span>
            <span>&middot;</span>
            <span>Live in minutes</span>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            Need help choosing?{" "}
            <a href="tel:2146126696" className="text-cyan-400 hover:underline">
              Talk to our team
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 border-t border-gray-800">
        <div className="container text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Nimbus Roofing. All rights reserved.</p>
          <p className="mt-1">McKinney, TX &middot; (214) 612-6696 &middot; nimbusroofing.com</p>
        </div>
      </footer>

      {/* Scroll animation CSS */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
