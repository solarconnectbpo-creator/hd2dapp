import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";
import { networkFetchFailureHint, safeUserFacingApiMessage } from "./safeApiError";
import type { CoxEstimateInput, CoxEstimateResult } from "./cox";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

export async function fetchCoxEstimateFromWorker(
  token: string,
  input: CoxEstimateInput,
): Promise<CoxEstimateResult> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");

  let res: Response;
  try {
    res = await fetch(`${base}/api/estimates/cox`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkFetchFailureHint(base, msg));
  }

  const data = await readJsonResponseBody<{
    success?: boolean;
    estimate?: CoxEstimateResult;
    error?: string;
  }>(res);

  if (!res.ok || data.success !== true || !data.estimate) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }

  return data.estimate;
}
