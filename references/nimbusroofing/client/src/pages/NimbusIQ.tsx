import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  FileText,
  Terminal,
  Brain,
  Activity,
  ChevronRight,
  ArrowRight,
  Cpu,
  Lock,
  Eye,
  BarChart3,
  Code2,
  Layers,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// Sovereign Dark color tokens
const COLORS = {
  bg: "#050a14",
  bgCard: "#0a1222",
  bgPanel: "#0d1830",
  border: "#1a2a4a",
  borderActive: "#00d9ff",
  cyan: "#00d9ff",
  cyanDim: "#00d9ff33",
  gold: "#d4af37",
  red: "#ef4444",
  green: "#22c55e",
  white: "#f0f4f8",
  muted: "#64748b",
  textDim: "#94a3b8",
};

type ReasoningStep = {
  step: number;
  action: string;
  tool: string;
  description: string;
  result: string;
  timestamp: string;
};

type Finding = {
  type: string;
  severity: string;
  title: string;
  description: string;
  ircCode: string;
  estimatedRecovery: number;
  calculation: string;
};

type AuditSummary = {
  totalFindings: number;
  criticalFindings: number;
  totalRecoveryEstimate: number;
  originalEstimate: number;
  correctedEstimate: number;
  complianceScore: number;
};

export default function NimbusIQ() {
  const [auditState, setAuditState] = useState<"idle" | "initializing" | "running" | "complete">("idle");
  const [visibleSteps, setVisibleSteps] = useState<ReasoningStep[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"terminal" | "findings" | "codes">("terminal");
  const reasoningRef = useRef<HTMLDivElement>(null);

  const runAudit = trpc.sovereignAudit.runAudit.useMutation({
    onSuccess: (data) => {
      const steps = data.auditResult.reasoningSteps || [];
      const allFindings = data.auditResult.findings || [];
      const auditSummary = data.auditResult.summary;

      // Animate reasoning steps one by one
      steps.forEach((step: ReasoningStep, i: number) => {
        setTimeout(() => {
          setVisibleSteps((prev) => [...prev, step]);
          if (reasoningRef.current) {
            reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
          }
        }, (i + 1) * 600);
      });

      // After all steps, show findings
      setTimeout(() => {
        setFindings(allFindings);
        setSummary(auditSummary);
        setAuditState("complete");
      }, (steps.length + 1) * 600 + 400);
    },
  });

  const handleInitAudit = () => {
    setAuditState("initializing");
    setVisibleSteps([]);
    setFindings([]);
    setSummary(null);

    // Brief initialization animation
    setTimeout(() => {
      setAuditState("running");
      runAudit.mutate({ mode: "demo" });
    }, 1500);
  };

  const toolIcons: Record<string, string> = {
    xactimate_parser: "📄",
    irc_vector_db: "📚",
    mckinney_ordinance_db: "🏛️",
    cost_calculator: "💰",
    compliance_checker: "✅",
  };

  const actionColors: Record<string, string> = {
    tool_call: COLORS.cyan,
    analysis: COLORS.gold,
    code_lookup: "#a78bfa",
    calculation: COLORS.green,
  };

  return (
    <div className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.white }}>
      {/* Top Navigation Bar */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: `${COLORS.bg}ee`, borderColor: COLORS.border, backdropFilter: "blur(12px)" }}
      >
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                style={{ background: `linear-gradient(135deg, ${COLORS.cyan}, #0ea5e9)`, color: COLORS.bg }}
              >
                N
              </div>
              <span className="font-bold text-lg tracking-tight">
                Nimbus <span style={{ color: COLORS.cyan }}>iQ</span>{" "}
                <span className="font-light text-sm" style={{ color: COLORS.muted }}>
                  AI
                </span>
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-mono"
              style={{ borderColor: COLORS.gold, color: COLORS.gold }}
            >
              ALPHA v5.1
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Link href="/nimbus-iq">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-semibold"
                style={{ color: COLORS.cyan }}
              >
                <Terminal className="h-4 w-4 mr-1.5" />
                MVP Demo
              </Button>
            </Link>
            <Link href="/nimbus-iq/pitch">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-semibold"
                style={{ color: COLORS.textDim }}
              >
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Pitch Deck
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm"
                style={{ color: COLORS.muted }}
              >
                Back to Site
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: COLORS.border }}>
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${COLORS.cyan}15 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, ${COLORS.gold}10 0%, transparent 50%)`,
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `linear-gradient(${COLORS.cyan}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.cyan}20 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />

        <div className="container relative py-12">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Badge style={{ background: COLORS.cyanDim, color: COLORS.cyan, border: "none" }}>
                  <Shield className="h-3 w-3 mr-1" /> Sovereign Infrastructure
                </Badge>
                <Badge style={{ background: `${COLORS.gold}20`, color: COLORS.gold, border: "none" }}>
                  Architecture Lock Edition
                </Badge>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
                Sovereign Audit
                <span className="block" style={{ color: COLORS.cyan }}>
                  Terminal
                </span>
              </h1>
              <p className="text-lg mb-6" style={{ color: COLORS.textDim }}>
                Ingest Xactimate XML. Cross-reference 2024 IRC Building Codes.
                <br />
                Recover every dollar the adjuster missed.
              </p>
            </div>

            {/* Status Panel */}
            <div
              className="hidden lg:block p-4 rounded-xl border"
              style={{ background: COLORS.bgCard, borderColor: COLORS.border }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: auditState === "idle" ? COLORS.muted : COLORS.green }}
                />
                <span className="text-xs font-mono" style={{ color: COLORS.muted }}>
                  SYSTEM STATUS
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono" style={{ color: COLORS.textDim }}>
                <div className="flex justify-between gap-8">
                  <span>Vertex AI</span>
                  <span style={{ color: COLORS.green }}>ONLINE</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>IRC Vector DB</span>
                  <span style={{ color: COLORS.green }}>SYNCED</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>Xactimate Parser</span>
                  <span style={{ color: COLORS.green }}>READY</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>PII Masking</span>
                  <span style={{ color: COLORS.cyan }}>ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel — Xactimate Data & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Xactimate Input Card */}
            <div
              className="rounded-xl border overflow-hidden"
              style={{ background: COLORS.bgCard, borderColor: COLORS.border }}
            >
              <div
                className="px-5 py-3 border-b flex items-center justify-between"
                style={{ borderColor: COLORS.border, background: COLORS.bgPanel }}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" style={{ color: COLORS.cyan }} />
                  <span className="text-sm font-semibold">Xactimate Estimate</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs font-mono"
                  style={{ borderColor: COLORS.border, color: COLORS.muted }}
                >
                  DEMO DATA
                </Badge>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs" style={{ color: COLORS.muted }}>Claim #</span>
                    <p className="font-mono font-semibold">CLM-2026-048291</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: COLORS.muted }}>Carrier</span>
                    <p className="font-semibold">State Farm</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs" style={{ color: COLORS.muted }}>Property</span>
                    <p className="font-semibold">4821 Stonebridge Ranch Pkwy, McKinney, TX 75071</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: COLORS.muted }}>Roof Squares</span>
                    <p className="font-mono font-semibold">38.6 SQ</p>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: COLORS.muted }}>Date of Loss</span>
                    <p className="font-mono font-semibold">2026-02-14</p>
                  </div>
                </div>

                {/* Line Items Preview */}
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: COLORS.border }}>
                  <div
                    className="px-3 py-2 text-xs font-semibold"
                    style={{ background: COLORS.bgPanel, color: COLORS.muted }}
                  >
                    LINE ITEMS ({7})
                  </div>
                  <div className="divide-y" style={{ borderColor: `${COLORS.border}80` }}>
                    {[
                      { sel: "RFGSHN", desc: "Comp. shingles - 30yr", total: "$11,017.21" },
                      { sel: "RFGFELT", desc: "Felt paper - 15#", total: "$714.10" },
                      { sel: "RFGRDGE", desc: "Ridge cap", total: "$361.25" },
                      { sel: "RFGVALY", desc: "Valley metal", total: "$367.50" },
                      { sel: "RFGVENT", desc: "Ridge vent", total: "$292.50" },
                      { sel: "RFGTEAR", desc: "Tear off", total: "$1,621.20" },
                      { sel: "RFGFLSH", desc: "Pipe jack flashing", total: "$260.00" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 flex items-center justify-between text-xs"
                        style={{ borderColor: `${COLORS.border}40` }}
                      >
                        <div className="flex items-center gap-2">
                          <code
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ background: COLORS.bgPanel, color: COLORS.cyan }}
                          >
                            {item.sel}
                          </code>
                          <span style={{ color: COLORS.textDim }}>{item.desc}</span>
                        </div>
                        <span className="font-mono font-semibold">{item.total}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="px-3 py-2 flex justify-between text-sm font-bold border-t"
                    style={{ borderColor: COLORS.border, background: COLORS.bgPanel }}
                  >
                    <span>Total RCV</span>
                    <span style={{ color: COLORS.white }}>$14,633.76</span>
                  </div>
                </div>

                {/* Initialize Button */}
                <Button
                  className="w-full h-12 text-base font-bold tracking-wide relative overflow-hidden"
                  style={{
                    background:
                      auditState === "idle"
                        ? `linear-gradient(135deg, ${COLORS.cyan}, #0ea5e9)`
                        : auditState === "complete"
                        ? COLORS.green
                        : COLORS.bgPanel,
                    color: auditState === "idle" ? COLORS.bg : COLORS.white,
                    border: auditState !== "idle" ? `1px solid ${COLORS.border}` : "none",
                  }}
                  onClick={handleInitAudit}
                  disabled={auditState === "initializing" || auditState === "running"}
                >
                  {auditState === "idle" && (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Initialize Live Audit
                    </>
                  )}
                  {auditState === "initializing" && (
                    <>
                      <Cpu className="h-5 w-5 mr-2 animate-spin" />
                      Connecting to Vertex AI...
                    </>
                  )}
                  {auditState === "running" && (
                    <>
                      <Brain className="h-5 w-5 mr-2 animate-pulse" />
                      Audit in Progress...
                    </>
                  )}
                  {auditState === "complete" && (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      Audit Complete — View Results
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Recovery Estimate Card — appears after audit */}
            <AnimatePresence>
              {summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: COLORS.bgCard,
                    borderColor: COLORS.gold,
                    boxShadow: `0 0 30px ${COLORS.gold}15`,
                  }}
                >
                  <div
                    className="px-5 py-3 border-b flex items-center gap-2"
                    style={{ borderColor: `${COLORS.gold}40`, background: `${COLORS.gold}10` }}
                  >
                    <DollarSign className="h-4 w-4" style={{ color: COLORS.gold }} />
                    <span className="text-sm font-bold" style={{ color: COLORS.gold }}>
                      Recovery Estimate
                    </span>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{ color: COLORS.muted }}>
                        Additional Revenue Identified
                      </p>
                      <p
                        className="text-4xl font-black font-mono"
                        style={{ color: COLORS.gold }}
                      >
                        ${summary.totalRecoveryEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        className="p-3 rounded-lg text-center"
                        style={{ background: COLORS.bgPanel }}
                      >
                        <p className="text-xs" style={{ color: COLORS.muted }}>
                          Original
                        </p>
                        <p className="font-mono font-bold">
                          ${summary.originalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div
                        className="p-3 rounded-lg text-center"
                        style={{ background: COLORS.bgPanel }}
                      >
                        <p className="text-xs" style={{ color: COLORS.muted }}>
                          Corrected
                        </p>
                        <p className="font-mono font-bold" style={{ color: COLORS.green }}>
                          ${summary.correctedEstimate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: COLORS.muted }}>Compliance Score</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-24 h-2 rounded-full overflow-hidden"
                          style={{ background: COLORS.bgPanel }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${summary.complianceScore}%`,
                              background:
                                summary.complianceScore < 60
                                  ? COLORS.red
                                  : summary.complianceScore < 80
                                  ? COLORS.gold
                                  : COLORS.green,
                            }}
                          />
                        </div>
                        <span
                          className="font-mono font-bold"
                          style={{
                            color:
                              summary.complianceScore < 60
                                ? COLORS.red
                                : summary.complianceScore < 80
                                ? COLORS.gold
                                : COLORS.green,
                          }}
                        >
                          {summary.complianceScore}/100
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: COLORS.muted }}>Findings</span>
                      <span className="font-mono font-bold">
                        {summary.totalFindings} total ({summary.criticalFindings} critical)
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Panel — Reasoning Feed */}
          <div className="lg:col-span-3">
            <div
              className="rounded-xl border overflow-hidden h-full flex flex-col"
              style={{ background: COLORS.bgCard, borderColor: COLORS.border, minHeight: "600px" }}
            >
              {/* Tabs */}
              <div
                className="flex border-b"
                style={{ borderColor: COLORS.border, background: COLORS.bgPanel }}
              >
                {[
                  { id: "terminal" as const, label: "Reasoning Feed", icon: Terminal },
                  { id: "findings" as const, label: `Findings${findings.length ? ` (${findings.length})` : ""}`, icon: AlertTriangle },
                  { id: "codes" as const, label: "IRC Codes", icon: Shield },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-4 py-3 text-sm font-semibold transition-colors border-b-2"
                    style={{
                      borderColor: activeTab === tab.id ? COLORS.cyan : "transparent",
                      color: activeTab === tab.id ? COLORS.cyan : COLORS.muted,
                      background: "transparent",
                    }}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto p-4" ref={reasoningRef}>
                {/* Reasoning Feed */}
                {activeTab === "terminal" && (
                  <div className="space-y-3 font-mono text-sm">
                    {auditState === "idle" && (
                      <div className="flex flex-col items-center justify-center h-80 text-center">
                        <Brain className="h-16 w-16 mb-4" style={{ color: `${COLORS.cyan}40` }} />
                        <p className="text-lg font-semibold mb-2" style={{ color: COLORS.muted }}>
                          Sovereign Audit Terminal
                        </p>
                        <p className="text-sm max-w-md" style={{ color: `${COLORS.muted}80` }}>
                          Click "Initialize Live Audit" to watch the Gemini agent cross-reference
                          the Xactimate estimate against 2024 IRC building codes in real time.
                        </p>
                      </div>
                    )}

                    {auditState === "initializing" && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center gap-2" style={{ color: COLORS.cyan }}>
                          <Cpu className="h-4 w-4 animate-spin" />
                          <span>Initializing Sovereign Audit Engine...</span>
                        </div>
                        <div className="flex items-center gap-2" style={{ color: COLORS.textDim }}>
                          <Lock className="h-3 w-3" />
                          <span className="text-xs">PII masking layer active</span>
                        </div>
                        <div className="flex items-center gap-2" style={{ color: COLORS.textDim }}>
                          <Layers className="h-3 w-3" />
                          <span className="text-xs">Loading IRC 2024 vector database...</span>
                        </div>
                      </motion.div>
                    )}

                    {(auditState === "running" || auditState === "complete") && (
                      <>
                        {visibleSteps.map((step, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="rounded-lg p-3 border"
                            style={{
                              background: COLORS.bgPanel,
                              borderColor: `${actionColors[step.action] || COLORS.border}30`,
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-base">{toolIcons[step.tool] || "🔧"}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    className="text-xs px-1.5 py-0"
                                    style={{
                                      background: `${actionColors[step.action] || COLORS.border}20`,
                                      color: actionColors[step.action] || COLORS.muted,
                                      border: "none",
                                    }}
                                  >
                                    {step.action}
                                  </Badge>
                                  <code className="text-xs" style={{ color: COLORS.muted }}>
                                    {step.tool}
                                  </code>
                                  <span className="text-xs ml-auto" style={{ color: COLORS.muted }}>
                                    {step.timestamp}
                                  </span>
                                </div>
                                <p className="text-sm mb-1" style={{ color: COLORS.white }}>
                                  {step.description}
                                </p>
                                <p className="text-xs" style={{ color: COLORS.textDim }}>
                                  → {step.result}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}

                        {auditState === "running" && (
                          <div className="flex items-center gap-2 py-2" style={{ color: COLORS.cyan }}>
                            <Activity className="h-4 w-4 animate-pulse" />
                            <span className="text-sm">Processing...</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Findings Tab */}
                {activeTab === "findings" && (
                  <div className="space-y-3">
                    {findings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-60 text-center">
                        <Eye className="h-12 w-12 mb-3" style={{ color: `${COLORS.muted}40` }} />
                        <p style={{ color: COLORS.muted }}>
                          Run an audit to see findings
                        </p>
                      </div>
                    ) : (
                      findings.map((finding, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="rounded-lg border p-4"
                          style={{
                            background: COLORS.bgPanel,
                            borderColor:
                              finding.severity === "critical"
                                ? `${COLORS.red}40`
                                : finding.severity === "high"
                                ? `${COLORS.gold}40`
                                : `${COLORS.border}`,
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className="text-xs"
                                style={{
                                  background:
                                    finding.severity === "critical"
                                      ? `${COLORS.red}20`
                                      : finding.severity === "high"
                                      ? `${COLORS.gold}20`
                                      : `${COLORS.cyan}20`,
                                  color:
                                    finding.severity === "critical"
                                      ? COLORS.red
                                      : finding.severity === "high"
                                      ? COLORS.gold
                                      : COLORS.cyan,
                                  border: "none",
                                }}
                              >
                                {finding.severity.toUpperCase()}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                                style={{ borderColor: COLORS.border, color: COLORS.muted }}
                              >
                                {finding.type}
                              </Badge>
                            </div>
                            <span
                              className="font-mono font-bold text-lg"
                              style={{ color: COLORS.gold }}
                            >
                              +${finding.estimatedRecovery.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <h4 className="font-bold mb-1">{finding.title}</h4>
                          <p className="text-sm mb-2" style={{ color: COLORS.textDim }}>
                            {finding.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" style={{ color: COLORS.cyan }} />
                              <code style={{ color: COLORS.cyan }}>{finding.ircCode}</code>
                            </div>
                            <div style={{ color: COLORS.muted }}>
                              {finding.calculation}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}

                {/* IRC Codes Tab */}
                {activeTab === "codes" && (
                  <div className="space-y-3">
                    {[
                      { code: "IRC R905.2.8.2", title: "Drip Edge", desc: "Required at all eaves and gables. Type D minimum." },
                      { code: "IRC R905.2.8.5", title: "Starter Strip", desc: "Required at all eave and rake edges." },
                      { code: "IRC R905.2.7", title: "Ice Barrier", desc: "Required where Jan avg temp ≤ 25°F. McKinney exempt but best practice." },
                      { code: "IRC R903.2", title: "Flashing", desc: "Required at all wall/roof intersections and direction changes." },
                      { code: "IRC R806.1", title: "Ventilation", desc: "Min 1 sqft NFA per 150 sqft attic floor." },
                      { code: "IRC R905.2.6", title: "Attachment", desc: "Min 4 fasteners/shingle. 6 in high-wind zones." },
                      { code: "IRC R905.1.1", title: "Underlayment", desc: "ASTM D226 or D4869 compliant required." },
                      { code: "McKinney Ord. 2024-08-142", title: "Permit", desc: "$150 base + $0.10/sqft. Inspection required." },
                    ].map((code, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}
                      >
                        <code
                          className="text-xs px-2 py-1 rounded shrink-0"
                          style={{ background: `${COLORS.cyan}15`, color: COLORS.cyan }}
                        >
                          {code.code}
                        </code>
                        <div>
                          <p className="font-semibold text-sm">{code.title}</p>
                          <p className="text-xs" style={{ color: COLORS.textDim }}>
                            {code.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sovereign Rules Footer */}
        <div
          className="mt-8 rounded-xl border p-6"
          style={{ background: COLORS.bgCard, borderColor: COLORS.border }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: COLORS.muted }}>
            SOVEREIGN COMPLIANCE RULES
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 shrink-0 mt-0.5" style={{ color: COLORS.cyan }} />
              <div>
                <p className="font-semibold text-sm mb-1">No Hallucinations</p>
                <p className="text-xs" style={{ color: COLORS.textDim }}>
                  Every audit finding must cite a specific IRC/IBC building code or local ordinance.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 mt-0.5" style={{ color: COLORS.gold }} />
              <div>
                <p className="font-semibold text-sm mb-1">PII Masking</p>
                <p className="text-xs" style={{ color: COLORS.textDim }}>
                  All claimant data is sanitized before inference. Zero raw PII reaches the model.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Code2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: COLORS.green }} />
              <div>
                <p className="font-semibold text-sm mb-1">Audit Trails</p>
                <p className="text-xs" style={{ color: COLORS.textDim }}>
                  Every revenue uplift suggestion is logged for legal-grade defensibility.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
