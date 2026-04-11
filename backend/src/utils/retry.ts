type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const isLastAttempt = attempt === config.maxRetries;
      if (isLastAttempt) {
        console.error(`[retry] Failed after ${config.maxRetries + 1} attempts:`, lastError);
        throw lastError;
      }
      const delayMs = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs,
      );
      console.warn(`[retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/** Like `retryWithBackoff`, but only retries when `shouldRetry(error)` is true. */
export async function retryWithBackoffWhen<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown) => boolean,
  options: RetryOptions = {},
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const isLastAttempt = attempt === config.maxRetries;
      if (isLastAttempt || !shouldRetry(e)) {
        if (isLastAttempt && shouldRetry(e)) {
          console.error(`[retry] Failed after ${config.maxRetries + 1} attempts:`, lastError);
        }
        throw lastError;
      }
      const delayMs = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs,
      );
      console.warn(`[retry] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms`);
      await sleep(delayMs);
    }
  }
  throw lastError;
}

export async function retryWithJitter<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  const baseDelay = 1000;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxRetries) throw lastError;
      const exp = Math.pow(2, attempt);
      const delay = baseDelay * exp + Math.random() * baseDelay * exp;
      await sleep(delay);
    }
  }
  throw lastError;
}
