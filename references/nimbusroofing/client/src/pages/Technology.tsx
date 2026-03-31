import { Cpu, Cloud, Zap, Shield, BarChart3, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Technology() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section with IQ AI Logo */}
      <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white py-20">
        <div className="container max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Logo */}
            <div className="md:w-1/3">
              <img
                src="/brand/NIMBUSROOFING2025LOGO.png"
                alt="Nimbus Roofing IQ AI Logo"
                className="w-full max-w-md mx-auto drop-shadow-2xl"
              />
            </div>

            {/* Content */}
            <div className="md:w-2/3">
              <Badge className="mb-4 bg-blue-500">Powered by AI</Badge>
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Nimbus Roofing IQ AI
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-6">
                McKinney's First AI-Powered Roofing Platform
              </p>
              <p className="text-lg text-gray-300">
                Utilizing ADK Builds to Drive 40% Growth and Adapt to Changing Markets.
                Our proprietary AI technology revolutionizes storm damage assessment,
                insurance claims processing, and customer service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Digital Architecture Overview */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Digital Architecture Overview
          </h2>

          <div className="mb-12">
            <img
              src="/brand/NimbusRoofingDigitalArchitectureOverview.png"
              alt="Nimbus Digital Architecture"
              className="w-full max-w-4xl mx-auto rounded-xl shadow-2xl"
            />
          </div>

          {/* Architecture Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Cloud className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Multi-Channel Marketing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Google Ads / Meta Ads</li>
                  <li>• Local SEO Optimization</li>
                  <li>• Email Campaign Automation</li>
                  <li>• Social Media Scheduler</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Cpu className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>AI SaaS Toolkit</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• AI Scheduling</li>
                  <li>• Proposal Generation</li>
                  <li>• Predictive Follow-Up</li>
                  <li>• Smart Automation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>Service Fulfillment</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Job Tracking</li>
                  <li>• Contract Signing</li>
                  <li>• Inspection Uploads</li>
                  <li>• Photo Logging</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* AI-Powered Business Growth */}
      <section className="py-16 bg-slate-50">
        <div className="container max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            AI-Powered Business Growth
          </h2>

          <div className="mb-12">
            <img
              src="/brand/NimbusRoofing_AI-PoweredBusinessGrowth.png"
              alt="AI-Powered Business Growth Flowchart"
              className="w-full max-w-3xl mx-auto rounded-xl shadow-2xl"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Nimbus Master Control Panel
                </CardTitle>
                <CardDescription>Dashboard for Ops + Analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Centralized command center providing real-time insights into
                  operations, marketing performance, and business metrics.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Storm Damage AI Agent
                </CardTitle>
                <CardDescription>94% Accurate Damage Assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Computer vision AI analyzes satellite and drone imagery to
                  identify hail impact, granule loss, and wind damage with
                  industry-leading accuracy.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Intelligent Lead Response
                </CardTitle>
                <CardDescription>Automated Lead Qualification</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  AI-powered lead scoring and automated follow-up sequences
                  ensure no opportunity is missed while prioritizing high-value
                  prospects.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-500" />
                  Claims Processing Automation
                </CardTitle>
                <CardDescription>$4,200+ Average Increase</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Automated documentation, supplement generation, and direct
                  carrier submission streamline the insurance claim process and
                  maximize settlements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16">
        <div className="container max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">
            Our Technology Stack
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Google Gemini AI", category: "AI Engine" },
              { name: "Computer Vision", category: "Damage Detection" },
              { name: "Weather APIs", category: "Storm Tracking" },
              { name: "CRM Integration", category: "Lead Management" },
              { name: "Document AI", category: "Claims Processing" },
              { name: "Automated Workflows", category: "Operations" },
              { name: "Real-time Analytics", category: "Business Intelligence" },
              { name: "Cloud Infrastructure", category: "Scalability" },
            ].map((tech, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <CardTitle className="text-lg">{tech.name}</CardTitle>
                  <CardDescription className="text-xs">{tech.category}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Experience the Future of Roofing
          </h2>
          <p className="text-xl mb-8">
            See how our AI-powered platform can transform your roofing project
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition"
            >
              Get Free AI Assessment
            </a>
            <a
              href="tel:+12146126696"
              className="bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-800 transition border-2 border-white"
            >
              Call (214) 612-6696
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
