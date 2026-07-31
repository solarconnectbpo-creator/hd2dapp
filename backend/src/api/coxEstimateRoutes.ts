import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  generateCoxEstimate,
  type CoxBuildingType,
  type CoxRoofSystem,
} from "../services/coxEstimate/generateCoxEstimate";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

function asBuildingType(v: unknown): CoxBuildingType | null {
  if (v === "oneStory" || v === "twoStory" || v === "threeStory") return v;
  return null;
}

function asRoofSystem(v: unknown): CoxRoofSystem | null {
  if (v === "shingles" || v === "tpo45mil" || v === "tpo60mil" || v === "modBit") return v;
  return null;
}

/**
 * POST /api/estimates/cox — authenticated Atlas/Cox tiered roof estimate.
 */
export async function handleCoxEstimateRoutes(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const j = jsonHeaders(corsHeaders);
  const p = normalizePath(path);
  if (p !== "/api/estimates/cox") return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: j });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
      status: 405,
      headers: j,
    });
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), {
      status: 401,
      headers: j,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
      status: 400,
      headers: j,
    });
  }

  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ success: false, error: "Request body must be an object." }), {
      status: 400,
      headers: j,
    });
  }

  const o = body as Record<string, unknown>;
  const roofArea = typeof o.roofArea === "number" ? o.roofArea : Number(o.roofArea);
  const pitch = typeof o.pitch === "string" ? o.pitch.trim() : "";
  const buildingType = asBuildingType(o.buildingType);
  const roofSystem = asRoofSystem(o.roofSystem);
  const tearOffRaw = o.tearOffLayers;
  const tearOffLayers =
    typeof tearOffRaw === "number"
      ? tearOffRaw
      : typeof tearOffRaw === "string"
        ? Number(tearOffRaw)
        : NaN;
  const taxRate =
    o.taxRate === undefined || o.taxRate === null
      ? undefined
      : typeof o.taxRate === "number"
        ? o.taxRate
        : Number(o.taxRate);

  if (!buildingType || !roofSystem || !Number.isFinite(roofArea) || !pitch || !Number.isFinite(tearOffLayers)) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Required: roofArea (number), pitch (e.g. 6:12), buildingType, roofSystem, tearOffLayers (0–4).",
      }),
      { status: 400, headers: j },
    );
  }

  try {
    const result = generateCoxEstimate({
      roofArea,
      pitch,
      buildingType,
      roofSystem,
      tearOffLayers: Math.trunc(tearOffLayers),
      taxRate: taxRate !== undefined && Number.isFinite(taxRate) ? taxRate : undefined,
      parcelId: typeof o.parcelId === "string" ? o.parcelId : undefined,
      projectName: typeof o.projectName === "string" ? o.projectName : undefined,
    });

    return new Response(
      JSON.stringify({
        success: true,
        estimate: result,
        requestedBy: payload.sub,
      }),
      { status: 200, headers: j },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Estimate failed.";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: j,
    });
  }
}
