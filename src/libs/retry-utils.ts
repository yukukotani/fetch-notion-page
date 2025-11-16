import {
  APIErrorCode,
  APIResponseError,
  isNotionClientError,
} from "@notionhq/client";

/**
 * Extracts the wait time (in seconds) from the Retry-After header
 */
function getRetryAfterSeconds(error: unknown): number | null {
  if (!isNotionClientError(error)) {
    return null;
  }

  // APIResponseError has headers property
  if (APIResponseError.isAPIResponseError(error)) {
    const headers = error.headers;
    if (headers) {
      let retryAfter: string | null = null;

      // If headers is a Headers object (browser Headers API)
      if (headers instanceof Headers) {
        retryAfter = headers.get("retry-after");
      }
      // If headers is a plain object
      else if (typeof headers === "object") {
        const headerObj = headers as Record<string, string>;
        retryAfter =
          headerObj["retry-after"] ||
          headerObj["Retry-After"] ||
          headerObj["RETRY-AFTER"] ||
          null;
      }

      if (retryAfter) {
        const seconds = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(seconds) && seconds > 0) {
          return seconds;
        }
      }
    }
  }

  return null;
}

/**
 * Waits for the specified number of seconds
 */
function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

/**
 * Checks if the error is a RateLimit error
 */
function isRateLimitError(error: unknown): boolean {
  if (!isNotionClientError(error)) {
    return false;
  }

  return (
    APIResponseError.isAPIResponseError(error) &&
    error.code === APIErrorCode.RateLimited
  );
}

export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;
  /** Default wait time in seconds when Retry-After header is not present (default: 1) */
  defaultRetryDelay?: number;
}

/**
 * Retries the function when a RateLimit error occurs
 */
export async function retryOnRateLimit<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, defaultRetryDelay = 1 } = options;

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If it's not a RateLimit error or max retries reached, throw the error
      if (!isRateLimitError(error) || attempt >= maxRetries) {
        throw error;
      }

      // Get wait time from Retry-After header
      const retryAfterSeconds = getRetryAfterSeconds(error);
      const waitSeconds = retryAfterSeconds ?? defaultRetryDelay;

      // Wait before retrying
      await sleep(waitSeconds);
    }
  }

  // This line should never be reached, but needed for TypeScript type checking
  throw lastError;
}
