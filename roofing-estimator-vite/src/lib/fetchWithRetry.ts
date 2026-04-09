/**
 * Fetch with limited retries for transient server / gateway failures.
 */

const DEFAULT_RETRY_MS = 450;

export type FetchWithRetryOptions = {
  /** Extra attempts after the first (default 1 retry = 2 total attempts). */
  retries?: number;
  /** Milliseconds before first retry; scaled by attempt index. */
  baseDelayMs?: number;
  /** Return true to retry this status code. */
  retryOn?: (status: number) => boolean;
};

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: FetchWithRetryOptions,
): Promise<Response> {
  const maxExtra = options?.retries ?? 1;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_RETRY_MS;
  const retryOn =
    options?.retryOn ??
    ((status: number) => status === 502 || status === 503 || status === 504);

  let last: Response | undefined;
  for (let attempt = 0; attempt <= maxExtra; attempt++) {
    last = await fetch(input, init);
    if (!retryOn(last.status) || attempt === maxExtra) {
      return last;
    }
    await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
  }
  return last!;
}
