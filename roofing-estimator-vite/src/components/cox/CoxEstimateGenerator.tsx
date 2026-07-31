import { useMemo, useState } from "react";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { useAuth } from "../../context/AuthContext";
import { useRoofing, type Estimate } from "../../context/RoofingContext";
import {
  coxResultToHd2dEstimateLines,
  formatPrice,
  generateCoxEstimate,
  pricingTiers,
  type CoxBuildingType,
  type CoxEstimateResult,
  type CoxRoofSystem,
  type CoxTierKey,
} from "../../lib/cox";
import { fetchCoxEstimateFromWorker } from "../../lib/coxClient";

const fieldClass =
  "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--x-text)] outline-none focus:border-sky-500/50";

const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--x-muted)]";

export function CoxEstimateGenerator() {
  const { session } = useAuth();
  const { measurements, addEstimate } = useRoofing();
  const [projectName, setProjectName] = useState("");
  const [roofArea, setRoofArea] = useState("2000");
  const [pitch, setPitch] = useState("6:12");
  const [buildingType, setBuildingType] = useState<CoxBuildingType>("oneStory");
  const [roofSystem, setRoofSystem] = useState<CoxRoofSystem>("shingles");
  const [tearOffLayers, setTearOffLayers] = useState("1");
  const [selectedTier, setSelectedTier] = useState<CoxTierKey>("better");
  const [result, setResult] = useState<CoxEstimateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<"local" | "worker" | null>(null);

  const measurementOptions = useMemo(
    () =>
      measurements
        .slice()
        .reverse()
        .map((m) => ({
          id: m.id,
          label: `${m.projectName} · ${Math.round(m.adjustedArea || m.totalArea)} sf`,
          area: m.adjustedArea || m.totalArea,
          pitch: m.pitch > 0 ? `${Math.round(m.pitch)}:12` : "6:12",
          name: m.projectName,
        })),
    [measurements],
  );

  const applyMeasurement = (measurementId: string) => {
    const m = measurementOptions.find((x) => x.id === measurementId);
    if (!m) return;
    setProjectName(m.name);
    if (m.area > 0) setRoofArea(String(Math.round(m.area)));
    setPitch(m.pitch);
  };

  const runEstimate = async () => {
    setBusy(true);
    try {
      const input = {
        projectName: projectName.trim() || undefined,
        roofArea: Number(roofArea),
        pitch: pitch.trim(),
        buildingType,
        roofSystem,
        tearOffLayers: Math.trunc(Number(tearOffLayers)),
      };

      if (session?.token) {
        try {
          const remote = await fetchCoxEstimateFromWorker(session.token, input);
          setResult(remote);
          setSource("worker");
          toast.success("Cox estimate calculated (server)");
          return;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Server estimate failed";
          toast.message("Using local Cox engine", { description: msg });
        }
      }

      const local = generateCoxEstimate(input);
      setResult(local);
      setSource("local");
      toast.success("Cox estimate calculated");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not calculate estimate";
      toast.error(msg);
      setResult(null);
      setSource(null);
    } finally {
      setBusy(false);
    }
  };

  const saveSelectedTier = () => {
    if (!result) {
      toast.error("Calculate an estimate first");
      return;
    }
    const lines = coxResultToHd2dEstimateLines(result, selectedTier);
    const estimate: Estimate = {
      id: crypto.randomUUID(),
      measurementId: "",
      projectName: result.projectName,
      date: new Date().toISOString().slice(0, 10),
      materials: lines.materials,
      labor: lines.labor,
      subtotal: lines.subtotal,
      tax: lines.tax,
      total: lines.total,
    };
    addEstimate(estimate);
    toast.success(`Saved ${pricingTiers[selectedTier].name} package to Estimates`);
  };

  return (
    <Card className="mb-8 border-white/[0.07] ring-1 ring-white/[0.04]">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Cox / Atlas estimate</CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              Good / Better / Best tiers from Atlas Cox pricing ($/SQ by story &amp; pitch, tear-off
              $80/SQ/layer, 8% tax).
            </CardDescription>
          </div>
          {source ? (
            <Badge variant="outline" className="border-sky-500/35 bg-sky-950/40 text-sky-200">
              {source === "worker" ? "Server" : "Local"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {measurementOptions.length > 0 ? (
          <div>
            <label className={labelClass} htmlFor="cox-measurement">
              Prefill from measurement
            </label>
            <select
              id="cox-measurement"
              className={fieldClass}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyMeasurement(e.target.value);
              }}
            >
              <option value="">Select a measurement…</option>
              {measurementOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={labelClass} htmlFor="cox-name">
              Project name
            </label>
            <input
              id="cox-name"
              className={fieldClass}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cox-area">
              Roof area (sq ft)
            </label>
            <input
              id="cox-area"
              type="number"
              min={1}
              max={50000}
              className={fieldClass}
              value={roofArea}
              onChange={(e) => setRoofArea(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cox-pitch">
              Pitch (rise:run)
            </label>
            <input
              id="cox-pitch"
              className={fieldClass}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="6:12"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cox-stories">
              Building type
            </label>
            <select
              id="cox-stories"
              className={fieldClass}
              value={buildingType}
              onChange={(e) => setBuildingType(e.target.value as CoxBuildingType)}
            >
              <option value="oneStory">One story</option>
              <option value="twoStory">Two story</option>
              <option value="threeStory">Three story</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cox-system">
              Roof system
            </label>
            <select
              id="cox-system"
              className={fieldClass}
              value={roofSystem}
              onChange={(e) => setRoofSystem(e.target.value as CoxRoofSystem)}
            >
              <option value="shingles">Shingles</option>
              <option value="tpo45mil">TPO 45-mil</option>
              <option value="tpo60mil">TPO 60-mil</option>
              <option value="modBit">Modified bitumen</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="cox-tearoff">
              Tear-off layers
            </label>
            <select
              id="cox-tearoff"
              className={fieldClass}
              value={tearOffLayers}
              onChange={(e) => setTearOffLayers(e.target.value)}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void runEstimate()} disabled={busy}>
            <Calculator className="h-4 w-4" aria-hidden />
            {busy ? "Calculating…" : "Calculate tiers"}
          </Button>
          <Button type="button" variant="secondary" onClick={saveSelectedTier} disabled={!result || busy}>
            <Save className="h-4 w-4" aria-hidden />
            Save {pricingTiers[selectedTier].name} package
          </Button>
        </div>

        {result ? (
          <div className="space-y-4 border-t border-white/[0.08] pt-4">
            <p className="text-sm text-[var(--x-muted)]">
              {result.squares} SQ · ${result.basePricePerSquare}/SQ base · material{" "}
              {formatPrice(result.materialCost)}
              {result.tearOffCost > 0 ? ` · tear-off ${formatPrice(result.tearOffCost)}` : ""} · base{" "}
              {formatPrice(result.totalBasePrice)}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {(["good", "better", "best"] as const).map((tier) => {
                const meta = pricingTiers[tier];
                const active = selectedTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedTier(tier)}
                    className={`rounded-lg border p-4 text-left transition ${
                      active
                        ? "border-sky-400/50 bg-sky-950/40 ring-1 ring-sky-400/30"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[var(--x-text)]">{meta.name}</span>
                      <span className="text-xs text-[var(--x-muted)]">{meta.warranty}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--x-muted)]">{meta.description}</p>
                    <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--x-text)]">
                      {formatPrice(result.estimate.total[tier])}
                    </p>
                    <p className="mt-1 text-xs text-[var(--x-muted)]">
                      Subtotal {formatPrice(result.estimate.subtotal[tier])} · Tax{" "}
                      {formatPrice(result.estimate.tax[tier])}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
