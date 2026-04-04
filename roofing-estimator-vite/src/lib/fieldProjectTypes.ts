/** Roofing / insurance pipeline stages for field jobs (local PWA). */

export const FIELD_PROJECT_PIPELINE_STAGES = [
  "intake",
  "documentation",
  "estimate",
  "insurance",
  "production",
  "closed",
] as const;

export type FieldPipelineStage = (typeof FIELD_PROJECT_PIPELINE_STAGES)[number];

const PIPELINE_SET = new Set<string>(FIELD_PROJECT_PIPELINE_STAGES);

export function isFieldPipelineStage(s: string): s is FieldPipelineStage {
  return PIPELINE_SET.has(s);
}

/** AI draft from POST /api/ai/roof-damage `data` object. */
export interface DamagePhotoAiSummary {
  damageTypes: string[];
  severity: number;
  recommendedAction: string;
  notes: string;
  summary: string;
  model?: string;
}

export interface DamagePhoto {
  id: string;
  capturedAt: string;
  caption?: string;
  /** JPEG data URL after client compress (preferred for localStorage). */
  imageDataUrl: string;
  aiSummary?: DamagePhotoAiSummary;
}

export interface FieldProject {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pipelineStage: FieldPipelineStage;
  photos: DamagePhoto[];
  linkedMeasurementId?: string | null;
  /** Deep link to opportunity/contact/board in GoHighLevel (https only). */
  ghlUrl?: string;
  /** Optional separate URL for iframe embed; if unset, embed is not suggested when only ghlUrl is set. */
  ghlEmbedUrl?: string;
}

export const MAX_FIELD_PROJECT_PHOTOS = 24;

function optString(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

const MAX_GHL_URL = 2048;

/** Accept only https URLs for GHL fields (avoids javascript: and mixed-content issues). */
export function optHttpsUrl(v: unknown, max = MAX_GHL_URL): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().slice(0, max);
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:") return undefined;
    return t;
  } catch {
    return undefined;
  }
}

function normalizeAiSummary(raw: unknown): DamagePhotoAiSummary | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const damageTypes = Array.isArray(o.damageTypes)
    ? o.damageTypes.map((x) => String(x)).filter(Boolean)
    : [];
  const severity =
    typeof o.severity === "number" && Number.isFinite(o.severity)
      ? Math.max(1, Math.min(5, Math.round(o.severity)))
      : 3;
  const recommendedAction =
    typeof o.recommendedAction === "string" ? o.recommendedAction : "Further Inspection";
  const notes = typeof o.notes === "string" ? o.notes.slice(0, 1200) : "";
  const summary = typeof o.summary === "string" ? o.summary.slice(0, 400) : "";
  const model = typeof o.model === "string" ? o.model : undefined;
  return { damageTypes, severity, recommendedAction, notes, summary, model };
}

export function normalizeDamagePhoto(raw: Record<string, unknown>): DamagePhoto | null {
  const id = raw.id;
  const capturedAt = raw.capturedAt;
  const imageDataUrl = raw.imageDataUrl;
  if (typeof id !== "string" || typeof capturedAt !== "string" || typeof imageDataUrl !== "string") {
    return null;
  }
  if (!imageDataUrl.startsWith("data:image/")) return null;
  return {
    id,
    capturedAt,
    caption: optString(raw.caption, 500),
    imageDataUrl,
    aiSummary: normalizeAiSummary(raw.aiSummary),
  };
}

export function normalizeFieldProject(raw: Record<string, unknown>): FieldProject | null {
  const id = raw.id;
  const name = raw.name;
  const createdAt = raw.createdAt;
  const updatedAt = raw.updatedAt;
  if (typeof id !== "string" || typeof name !== "string" || typeof createdAt !== "string") {
    return null;
  }
  const stageRaw = typeof raw.pipelineStage === "string" ? raw.pipelineStage : "intake";
  const pipelineStage = isFieldPipelineStage(stageRaw) ? stageRaw : "intake";
  const photosIn = Array.isArray(raw.photos) ? raw.photos : [];
  const photos: DamagePhoto[] = [];
  for (const p of photosIn) {
    if (p && typeof p === "object") {
      const ph = normalizeDamagePhoto(p as Record<string, unknown>);
      if (ph) photos.push(ph);
    }
  }
  const linked =
    raw.linkedMeasurementId === null || raw.linkedMeasurementId === undefined
      ? null
      : typeof raw.linkedMeasurementId === "string"
        ? raw.linkedMeasurementId
        : null;

  const ghlUrl = optHttpsUrl(raw.ghlUrl);
  const ghlEmbedUrl = optHttpsUrl(raw.ghlEmbedUrl);

  return {
    id,
    name: name.slice(0, 200),
    address: optString(raw.address, 500),
    notes: optString(raw.notes, 2000),
    createdAt,
    updatedAt: typeof updatedAt === "string" ? updatedAt : createdAt,
    pipelineStage,
    photos: photos.slice(0, MAX_FIELD_PROJECT_PHOTOS),
    linkedMeasurementId: linked,
    ...(ghlUrl ? { ghlUrl } : {}),
    ...(ghlEmbedUrl ? { ghlEmbedUrl } : {}),
  };
}

export function fieldProjectStageLabel(stage: FieldPipelineStage): string {
  const labels: Record<FieldPipelineStage, string> = {
    intake: "Intake",
    documentation: "Documentation",
    estimate: "Estimate",
    insurance: "Insurance",
    production: "Production",
    closed: "Closed",
  };
  return labels[stage];
}
