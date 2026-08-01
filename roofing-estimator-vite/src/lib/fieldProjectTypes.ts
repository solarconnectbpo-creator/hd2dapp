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
  /**
   * JPEG data URL after client compress. Empty on a device that pulled the project
   * from the server but has not fetched the blob yet — use {@link remoteKey}.
   */
  imageDataUrl: string;
  /** Set once the image is stored in R2; fetch via GET /api/workspace/files/:key. */
  remoteKey?: string;
  aiSummary?: DamagePhotoAiSummary;
}

export interface FieldProject {
  id: string;
  name: string;
  address?: string;
  notes?: string;
  /**
   * Auto-generated storm / damage documentation from photo AI drafts.
   * Kept separate from `notes` so site metadata is not overwritten.
   */
  aiReport?: string;
  createdAt: string;
  updatedAt: string;
  pipelineStage: FieldPipelineStage;
  photos: DamagePhoto[];
  linkedMeasurementId?: string | null;
  /** Optional deal-style value for list/board (USD). */
  monetaryValueUsd?: number;
  /** Assignee or rep label (local CRM-style). */
  ownerLabel?: string;
  /** Short labels, e.g. hail, insurance, commercial. */
  tags: string[];
  /** Deep link to opportunity/contact/board in GoHighLevel (https only). */
  ghlUrl?: string;
  /** Optional separate URL for iframe embed; if unset, embed is not suggested when only ghlUrl is set. */
  ghlEmbedUrl?: string;
}

export const MAX_FIELD_PROJECT_AI_REPORT = 8000;

/**
 * Union-merge photos so a remote project with fewer ids cannot wipe local captures.
 * Prefer non-empty local JPEG bytes; keep remoteKey / AI / caption from the richer side.
 */
export function mergeFieldProjectPhotos(incoming: FieldProject, local: FieldProject | undefined): FieldProject {
  if (!local) return incoming;
  const localById = new Map(local.photos.map((p) => [p.id, p]));
  const incomingIds = new Set(incoming.photos.map((p) => p.id));
  const merged: DamagePhoto[] = incoming.photos.map((remote) => {
    const loc = localById.get(remote.id);
    if (!loc) return remote;
    return {
      ...remote,
      imageDataUrl: remote.imageDataUrl || loc.imageDataUrl || "",
      remoteKey: remote.remoteKey || loc.remoteKey,
      caption: remote.caption ?? loc.caption,
      aiSummary: remote.aiSummary ?? loc.aiSummary,
    };
  });
  for (const loc of local.photos) {
    if (!incomingIds.has(loc.id)) merged.push(loc);
  }
  merged.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const aiReport = incoming.aiReport || local.aiReport;
  return {
    ...incoming,
    photos: merged.slice(0, MAX_FIELD_PROJECT_PHOTOS),
    ...(aiReport ? { aiReport } : {}),
  };
}

export const MAX_FIELD_PROJECT_PHOTOS = 24;

function optString(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

const MAX_TAGS = 12;
const MAX_TAG_LEN = 32;

export function normalizeTagList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    const out: string[] = [];
    for (const x of raw) {
      if (typeof x !== "string") continue;
      const t = x.trim().slice(0, MAX_TAG_LEN);
      if (t && !out.includes(t)) out.push(t);
      if (out.length >= MAX_TAGS) break;
    }
    return out;
  }
  if (typeof raw === "string") {
    const parts = raw.split(/[,;]/).map((s) => s.trim().slice(0, MAX_TAG_LEN)).filter(Boolean);
    const out: string[] = [];
    for (const t of parts) {
      if (!out.includes(t)) out.push(t);
      if (out.length >= MAX_TAGS) break;
    }
    return out;
  }
  return [];
}

function optNonNegativeMoney(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return Math.round(v * 100) / 100;
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
  const remoteKey = optString(raw.remoteKey, 512);
  // Sync strips JPEG bytes (`""`) and keeps captions/AI/remoteKey. Accept empty
  // imageDataUrl so pull+merge can reattach local bytes or fetch via remoteKey.
  const hasLocalJpeg = imageDataUrl.startsWith("data:image/");
  const hasPlaceholder = imageDataUrl === "";
  if (!hasLocalJpeg && !hasPlaceholder) return null;
  return {
    id,
    capturedAt,
    caption: optString(raw.caption, 500),
    imageDataUrl: hasLocalJpeg ? imageDataUrl : "",
    ...(remoteKey ? { remoteKey } : {}),
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
  const monetaryValueUsd = optNonNegativeMoney(raw.monetaryValueUsd);
  const ownerLabel = optString(raw.ownerLabel, 120);
  const tags = normalizeTagList(raw.tags);
  const aiReport = optString(raw.aiReport, MAX_FIELD_PROJECT_AI_REPORT);

  return {
    id,
    name: name.slice(0, 200),
    address: optString(raw.address, 500),
    notes: optString(raw.notes, 2000),
    ...(aiReport ? { aiReport } : {}),
    createdAt,
    updatedAt: typeof updatedAt === "string" ? updatedAt : createdAt,
    pipelineStage,
    photos: photos.slice(0, MAX_FIELD_PROJECT_PHOTOS),
    linkedMeasurementId: linked,
    tags,
    ...(monetaryValueUsd != null ? { monetaryValueUsd } : {}),
    ...(ownerLabel ? { ownerLabel } : {}),
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
