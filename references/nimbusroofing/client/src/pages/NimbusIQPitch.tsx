import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Zap,
  DollarSign,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Terminal,
  Brain,
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Globe,
  Layers,
  Lock,
  Cpu,
  Code2,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = {
  bg: "#050a14",
  bgCard: "#0a1222",
  bgPanel: "#0d1830",
  border: "#1a2a4a",
  cyan: "#00d9ff",
  cyanDim: "#00d9ff33",
  gold: "#d4af37",
  red: "#ef4444",
  green: "#22c55e",
  white: "#f0f4f8",
  muted: "#64748b",
  textDim: "#94a3b8",
};

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export default function NimbusIQPitch() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: Slide[] = [
    // Slide 1: Title / Vision
    {
      id: 1,
      title: "Nimbus iQ AI",
      subtitle: "The Infrastructure Layer for the $45B Roofing Market",
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-8"
              style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, #0ea5e9)` }}
            >
              <span className="text-5xl font-black" style={{ color: COLORS.bg }}>N</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-4">
              Nimbus <span style={{ color: COLORS.cyan }}>iQ</span> AI
            </h1>
            <p className="text-xl md:text-2xl font-light mb-8" style={{ color: COLORS.textDim }}>
              Sovereign Roofing Intelligence
            </p>
            <div className="flex items-center justify-center gap-4 mb-12">
              <Badge style={{ background: COLORS.cyanDim, color: COLORS.cyan, border: "none" }} className="text-sm px-4 py-1.5">
                <Shield className="h-4 w-4 mr-1.5" /> Sovereign Infrastructure
              </Badge>
              <Badge style={{ background: `${COLORS.gold}20`, color: COLORS.gold, border: "none" }} className="text-sm px-4 py-1.5">
                <Brain className="h-4 w-4 mr-1.5" /> Vertex AI Powered
              </Badge>
            </div>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: COLORS.textDim }}>
              The first platform that doesn't just "chat" with insurance PDFs — it <strong style={{ color: COLORS.white }}>audibly verifies</strong> them against regulatory kernels.
            </p>
          </motion.div>
        </div>
      ),
    },

    // Slide 2: Problem
    {
      id: 2,
      title: "The Problem",
      subtitle: "$12B+ Left on the Table Every Year",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">
              Insurance Adjusters
              <span className="block" style={{ color: COLORS.red }}>Systematically Underpay</span>
            </h2>
            <div className="space-y-4">
              {[
                { stat: "73%", desc: "of Xactimate estimates are missing code-required line items" },
                { stat: "$4,200", desc: "average underpayment per residential claim" },
                { stat: "2.1M", desc: "roofing claims filed annually in Texas alone" },
                { stat: "48 hrs", desc: "average time for manual estimate review by contractors" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-start gap-4"
                >
                  <span className="text-2xl font-black font-mono shrink-0" style={{ color: COLORS.cyan, minWidth: "80px" }}>
                    {item.stat}
                  </span>
                  <span style={{ color: COLORS.textDim }}>{item.desc}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: `${COLORS.red}30` }}>
            <h3 className="font-bold mb-4" style={{ color: COLORS.red }}>Today's Workflow is Broken</h3>
            <div className="space-y-3 text-sm">
              {[
                "Contractor receives Xactimate estimate from adjuster",
                "Manually reviews 50+ line items against building codes",
                "Misses 3-5 code-required items on average",
                "Leaves $3,000-$8,000 on the table per claim",
                "No audit trail for supplement disputes",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-mono mt-1" style={{ color: COLORS.red }}>✕</span>
                  <span style={{ color: COLORS.textDim }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // Slide 3: Solution — Sovereign Infrastructure
    {
      id: 3,
      title: "The Solution",
      subtitle: "Sovereign Infrastructure — Not Another ChatGPT Wrapper",
      content: (
        <div className="h-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-3">
              We Don't "Chat" With PDFs.
              <span className="block" style={{ color: COLORS.cyan }}>We Audit Them Against Regulatory Kernels.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                title: "Xactimate Ingestion",
                desc: "Native XML parsing of Xactimate estimates. Every line item, selector code, and pricing unit extracted and normalized.",
                color: COLORS.cyan,
              },
              {
                icon: Shield,
                title: "IRC Vector Database",
                desc: "2024 IRC/IBC building codes vectorized and indexed. Cross-referenced against local municipal ordinances in real-time.",
                color: COLORS.gold,
              },
              {
                icon: Brain,
                title: "Gemini 2.5 Pro Reasoning",
                desc: "Multimodal reasoning engine that audits estimates against code requirements. Every finding cites a specific code section.",
                color: COLORS.green,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.2 }}
                className="rounded-xl border p-6"
                style={{ background: COLORS.bgPanel, borderColor: `${item.color}30` }}
              >
                <item.icon className="h-8 w-8 mb-4" style={{ color: item.color }} />
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm" style={{ color: COLORS.textDim }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-8 rounded-xl border p-4 flex items-center justify-between" style={{ background: COLORS.bgCard, borderColor: COLORS.border }}>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5" style={{ color: COLORS.gold }} />
              <span className="text-sm font-semibold">Sovereign Compliance:</span>
            </div>
            <div className="flex items-center gap-6 text-xs" style={{ color: COLORS.textDim }}>
              <span>Zero Hallucinations</span>
              <span>PII Masking</span>
              <span>Legal-Grade Audit Trails</span>
              <span>SOC 2 Ready</span>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 4: Technology Stack
    {
      id: 4,
      title: "Technology",
      subtitle: "Built on Google Cloud — Production-Grade from Day One",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-2">
              Vertex AI
              <span className="block text-xl font-light" style={{ color: COLORS.textDim }}>
                + Custom Agentic Orchestration
              </span>
            </h2>
            {[
              { label: "Foundation Model", value: "Gemini 2.5 Pro", sub: "Multimodal reasoning with tool use" },
              { label: "Orchestration", value: "Custom Agent Flow", sub: "Logic Injection architecture" },
              { label: "Vector Store", value: "IRC Code Embeddings", sub: "2024 IRC + local ordinances" },
              { label: "Frontend", value: "Next.js 14 + Tailwind", sub: "App Router with streaming" },
              { label: "Infrastructure", value: "Google Cloud Platform", sub: "Cloud Run + Cloud SQL + Vertex AI" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 p-3 rounded-lg border"
                style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: COLORS.muted }}>{item.label}</span>
                  </div>
                  <p className="font-bold">{item.value}</p>
                  <p className="text-xs" style={{ color: COLORS.textDim }}>{item.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: `${COLORS.cyan}20` }}>
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Code2 className="h-5 w-5" style={{ color: COLORS.cyan }} />
              Agentic Flow Architecture
            </h3>
            <div className="space-y-3 font-mono text-sm">
              {[
                { step: "01", label: "INGEST", desc: "Parse Xactimate XML → Normalized Schema" },
                { step: "02", label: "EMBED", desc: "Vectorize line items → Semantic space" },
                { step: "03", label: "QUERY", desc: "IRC Vector DB → Code requirements" },
                { step: "04", label: "REASON", desc: "Gemini 2.5 → Gap analysis + citations" },
                { step: "05", label: "VERIFY", desc: "Compliance check → No hallucinations" },
                { step: "06", label: "OUTPUT", desc: "Audit report → Legal-grade findings" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded" style={{ background: COLORS.bgCard, color: COLORS.cyan }}>
                    {item.step}
                  </span>
                  <span className="font-bold text-xs" style={{ color: COLORS.white, minWidth: "60px" }}>{item.label}</span>
                  <span className="text-xs" style={{ color: COLORS.textDim }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // Slide 5: Market Opportunity
    {
      id: 5,
      title: "Market",
      subtitle: "The $45B Roofing Industry is Ripe for Disruption",
      content: (
        <div className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { value: "$45B", label: "US Roofing Market", sub: "Annual revenue, growing 4.2% CAGR", color: COLORS.cyan },
              { value: "120K+", label: "Roofing Contractors", sub: "Potential platform users", color: COLORS.gold },
              { value: "$8.4B", label: "Insurance Claims", sub: "Annual residential roof claims in TX", color: COLORS.green },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="rounded-xl border p-6 text-center"
                style={{ background: COLORS.bgPanel, borderColor: `${item.color}30` }}
              >
                <p className="text-4xl font-black font-mono mb-2" style={{ color: item.color }}>{item.value}</p>
                <p className="font-bold text-sm mb-1">{item.label}</p>
                <p className="text-xs" style={{ color: COLORS.textDim }}>{item.sub}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" style={{ color: COLORS.cyan }} />
                Beachhead: DFW Metroplex
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  "4th largest metro in the US — 8M+ population",
                  "Hail Alley: 2-3 major hail events per year",
                  "500+ active roofing contractors in DFW",
                  "McKinney: #1 fastest growing city in TX",
                  "Average claim value: $18,500 (residential)",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" style={{ color: COLORS.cyan }} />
                    <span style={{ color: COLORS.textDim }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5" style={{ color: COLORS.gold }} />
                Expansion Path
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { phase: "Phase 1", market: "DFW Metroplex", timeline: "Q1 2026" },
                  { phase: "Phase 2", market: "Texas Statewide", timeline: "Q3 2026" },
                  { phase: "Phase 3", market: "Hail Belt (CO, OK, KS, NE)", timeline: "Q1 2027" },
                  { phase: "Phase 4", market: "National + Hurricane Markets", timeline: "Q3 2027" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded" style={{ background: COLORS.bgCard }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: COLORS.cyanDim, color: COLORS.cyan }}>{item.phase}</span>
                      <span style={{ color: COLORS.textDim }}>{item.market}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: COLORS.muted }}>{item.timeline}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 6: Economics — "Why Now"
    {
      id: 6,
      title: "Economics",
      subtitle: "ROI Realized on the Very First Claim",
      content: (
        <div className="h-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold">
              The Math is
              <span style={{ color: COLORS.gold }}> Undeniable</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: `${COLORS.gold}30` }}>
                <h3 className="font-bold mb-4" style={{ color: COLORS.gold }}>Per-Claim Economics</h3>
                <div className="space-y-3">
                  {[
                    { label: "Average Recovery per Audit", value: "$4,224", color: COLORS.gold },
                    { label: "Nimbus iQ Fee (per audit)", value: "$149", color: COLORS.cyan },
                    { label: "Net Contractor Gain", value: "$4,075", color: COLORS.green },
                    { label: "ROI per Claim", value: "2,735%", color: COLORS.green },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: COLORS.textDim }}>{item.label}</span>
                      <span className="font-mono font-bold" style={{ color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
                <h3 className="font-bold mb-4">Revenue Model</h3>
                <div className="space-y-3 text-sm">
                  {[
                    { tier: "Starter", price: "$99/mo", audits: "10 audits", desc: "Solo contractors" },
                    { tier: "Pro", price: "$299/mo", audits: "50 audits", desc: "Growing companies" },
                    { tier: "Enterprise", price: "$999/mo", audits: "Unlimited", desc: "Multi-crew operations" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg" style={{ background: COLORS.bgCard }}>
                      <div>
                        <span className="font-bold">{item.tier}</span>
                        <span className="text-xs ml-2" style={{ color: COLORS.muted }}>{item.desc}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold" style={{ color: COLORS.cyan }}>{item.price}</span>
                        <span className="text-xs block" style={{ color: COLORS.muted }}>{item.audits}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: `${COLORS.green}30` }}>
              <h3 className="font-bold mb-6" style={{ color: COLORS.green }}>5-Year Revenue Projection</h3>
              <div className="space-y-4">
                {[
                  { year: "Year 1", revenue: "$480K", customers: "200", arr: "$480K" },
                  { year: "Year 2", revenue: "$2.4M", customers: "800", arr: "$2.4M" },
                  { year: "Year 3", revenue: "$8.5M", customers: "2,500", arr: "$8.5M" },
                  { year: "Year 4", revenue: "$22M", customers: "6,000", arr: "$22M" },
                  { year: "Year 5", revenue: "$45M", customers: "12,000", arr: "$45M" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{item.year}</span>
                      <span className="font-mono font-bold" style={{ color: COLORS.green }}>{item.revenue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: COLORS.bgCard }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (i + 1) * 20)}%` }}
                          transition={{ delay: i * 0.2, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.green})` }}
                        />
                      </div>
                      <span className="text-xs font-mono" style={{ color: COLORS.muted }}>{item.customers} customers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 7: Traction
    {
      id: 7,
      title: "Traction",
      subtitle: "From McKinney to Market",
      content: (
        <div className="h-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { value: "154", label: "Google Reviews", sub: "4.9 avg rating", color: COLORS.gold },
              { value: "500+", label: "Roofs Completed", sub: "Since 2019", color: COLORS.cyan },
              { value: "$8.2M", label: "Claims Processed", sub: "Lifetime value", color: COLORS.green },
              { value: "12", label: "AI Agents", sub: "In production", color: "#a78bfa" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border p-4 text-center"
                style={{ background: COLORS.bgPanel, borderColor: `${item.color}30` }}
              >
                <p className="text-3xl font-black font-mono" style={{ color: item.color }}>{item.value}</p>
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-xs" style={{ color: COLORS.muted }}>{item.sub}</p>
              </motion.div>
            ))}
          </div>
          <div className="rounded-xl border p-6" style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
            <h3 className="font-bold mb-4">Milestones</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { date: "2019", event: "Nimbus Roofing founded in McKinney, TX" },
                { date: "2024", event: "Google for Startups Cloud Program accepted" },
                { date: "2025", event: "AI-powered claims analysis system deployed" },
                { date: "2025", event: "Sovereign Audit Terminal alpha launched" },
                { date: "2026", event: "Nimbus iQ AI platform — Architecture Lock v5.1" },
                { date: "2026", event: "First 50 beta contractors onboarded (target)" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2">
                  <span className="text-xs font-mono px-2 py-1 rounded shrink-0" style={{ background: COLORS.bgCard, color: COLORS.cyan }}>
                    {item.date}
                  </span>
                  <span className="text-sm" style={{ color: COLORS.textDim }}>{item.event}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },

    // Slide 8: Team
    {
      id: 8,
      title: "Team",
      subtitle: "Operator-Led, AI-Native",
      content: (
        <div className="h-full flex flex-col justify-center">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl border p-8 mb-6" style={{ background: COLORS.bgPanel, borderColor: `${COLORS.cyan}30` }}>
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, #0ea5e9)` }}>
                  <span className="text-3xl font-black" style={{ color: COLORS.bg }}>DM</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-1">Dustin Moore</h3>
                  <p className="text-sm mb-4" style={{ color: COLORS.cyan }}>Founder & CEO</p>
                  <div className="space-y-2 text-sm" style={{ color: COLORS.textDim }}>
                    <p>7+ years operating in the roofing industry. Built Nimbus Roofing from zero to 500+ completed projects and 154 five-star reviews.</p>
                    <p>Deep domain expertise in insurance claims, Xactimate workflows, and building code compliance. Now applying that operational knowledge to build the intelligence layer the industry needs.</p>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Badge style={{ background: COLORS.bgCard, color: COLORS.textDim, border: `1px solid ${COLORS.border}` }}>
                      <MapPin className="h-3 w-3 mr-1" /> McKinney, TX
                    </Badge>
                    <Badge style={{ background: COLORS.bgCard, color: COLORS.textDim, border: `1px solid ${COLORS.border}` }}>
                      <Building2 className="h-3 w-3 mr-1" /> Google for Startups
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border p-6" style={{ background: COLORS.bgCard, borderColor: COLORS.border }}>
              <h3 className="font-bold mb-3 text-sm" style={{ color: COLORS.muted }}>ADVISORY & PARTNERSHIPS</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.cyan }} />
                  <span style={{ color: COLORS.textDim }}>Google Cloud Partner</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.cyan }} />
                  <span style={{ color: COLORS.textDim }}>Gemini AI Early Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.cyan }} />
                  <span style={{ color: COLORS.textDim }}>Owens Corning Preferred</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.cyan }} />
                  <span style={{ color: COLORS.textDim }}>GAF Certified Installer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 9: The Ask
    {
      id: 9,
      title: "The Ask",
      subtitle: "Seed Round — Building the Infrastructure Layer",
      content: (
        <div className="h-full flex flex-col justify-center">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm mb-2" style={{ color: COLORS.muted }}>RAISING</p>
              <p className="text-6xl font-black font-mono mb-2" style={{ color: COLORS.cyan }}>$1.5M</p>
              <p className="text-lg mb-8" style={{ color: COLORS.textDim }}>Seed Round</p>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { pct: "40%", label: "Engineering", desc: "Vertex AI pipeline, IRC vector DB, Xactimate parser" },
                { pct: "30%", label: "Go-to-Market", desc: "DFW contractor acquisition, partnerships" },
                { pct: "30%", label: "Operations", desc: "Compliance, legal, infrastructure scaling" },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border p-5" style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
                  <p className="text-3xl font-black font-mono mb-1" style={{ color: COLORS.gold }}>{item.pct}</p>
                  <p className="font-bold text-sm mb-1">{item.label}</p>
                  <p className="text-xs" style={{ color: COLORS.textDim }}>{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border p-6" style={{ background: `${COLORS.cyan}08`, borderColor: `${COLORS.cyan}30` }}>
              <p className="text-lg font-bold mb-2">
                "The ROI for an operator is realized on the <span style={{ color: COLORS.gold }}>very first claim</span>."
              </p>
              <p className="text-sm" style={{ color: COLORS.textDim }}>
                Every dollar of underpayment we recover pays for the platform many times over.
                <br />This isn't a cost center — it's a <strong style={{ color: COLORS.white }}>profit engine</strong>.
              </p>
            </div>
            <div className="mt-8">
              <p className="text-sm" style={{ color: COLORS.muted }}>
                Dustin Moore — Founder & CEO — McKinney, TX Hub
              </p>
              <p className="text-sm font-mono mt-1" style={{ color: COLORS.cyan }}>
                dustin@nimbusroofing.com
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: COLORS.bg, color: COLORS.white }}>
      {/* Top Navigation */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: `${COLORS.bg}ee`, borderColor: COLORS.border, backdropFilter: "blur(12px)" }}
      >
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs"
                style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, #0ea5e9)`, color: COLORS.bg }}
              >
                N
              </div>
              <span className="font-bold tracking-tight">
                Nimbus <span style={{ color: COLORS.cyan }}>iQ</span>{" "}
                <span className="font-light text-xs" style={{ color: COLORS.muted }}>AI</span>
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-mono" style={{ borderColor: COLORS.gold, color: COLORS.gold }}>
              INVESTOR DECK
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/nimbus-iq">
              <Button variant="ghost" size="sm" className="text-sm" style={{ color: COLORS.textDim }}>
                <Terminal className="h-4 w-4 mr-1.5" />
                MVP Demo
              </Button>
            </Link>
            <Link href="/nimbus-iq/pitch">
              <Button variant="ghost" size="sm" className="text-sm font-semibold" style={{ color: COLORS.cyan }}>
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Pitch Deck
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-sm" style={{ color: COLORS.muted }}>
                Back to Site
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 container py-8 flex flex-col">
          {/* Slide Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: COLORS.bgPanel, color: COLORS.cyan }}>
                  {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
                </span>
                <h2 className="text-xl font-bold">{slides[currentSlide].title}</h2>
              </div>
              {slides[currentSlide].subtitle && (
                <p className="text-sm mt-1" style={{ color: COLORS.textDim }}>
                  {slides[currentSlide].subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                style={{ borderColor: COLORS.border, color: COLORS.muted }}
                onClick={() => goToSlide(currentSlide - 1)}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                style={{ borderColor: COLORS.border, color: COLORS.muted }}
                onClick={() => goToSlide(currentSlide + 1)}
                disabled={currentSlide === slides.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Slide Body */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {slides[currentSlide].content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Slide Navigation Dots */}
        <div className="border-t py-4" style={{ borderColor: COLORS.border }}>
          <div className="container flex items-center justify-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className="group flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
                style={{
                  background: i === currentSlide ? COLORS.bgPanel : "transparent",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{
                    background: i === currentSlide ? COLORS.cyan : COLORS.border,
                  }}
                />
                <span
                  className="text-xs hidden md:inline transition-colors"
                  style={{
                    color: i === currentSlide ? COLORS.cyan : COLORS.muted,
                  }}
                >
                  {slide.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
