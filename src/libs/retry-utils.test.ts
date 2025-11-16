import {
  APIErrorCode,
  APIResponseError,
} from "@notionhq/client";
import { describe, expect, test, vi } from "vitest";
import { retryOnRateLimit } from "./retry-utils.js";

/**
 * Helper function to create a mock APIResponseError for testing
 */
function createRateLimitError(
  retryAfter?: string,
  headers?: Record<string, string> | Headers,
): APIResponseError {
  const errorHeaders = headers || (retryAfter ? { "retry-after": retryAfter } : {});
  return new APIResponseError({
    code: APIErrorCode.RateLimited,
    status: 429,
    message: "Rate limited",
    headers: errorHeaders as any,
    rawBodyText: JSON.stringify({ code: "rate_limited" }),
  });
}

describe("retryOnRateLimit", () => {
  test("succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const result = await retryOnRateLimit(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on rate limit error and succeeds", async () => {
    const rateLimitError = createRateLimitError("0.01");

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const result = await retryOnRateLimit(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("retries up to maxRetries times", async () => {
    const rateLimitError = createRateLimitError("0.01");

    const fn = vi.fn().mockRejectedValue(rateLimitError);

    await expect(
      retryOnRateLimit(fn, { maxRetries: 2 }),
    ).rejects.toThrow("Rate limited");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  test("uses Retry-After header value for wait time", async () => {
    const rateLimitError = createRateLimitError("0.01");

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const result = await retryOnRateLimit(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("uses defaultRetryDelay when Retry-After header is missing", async () => {
    const rateLimitError = createRateLimitError(undefined, {});

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const result = await retryOnRateLimit(fn, { defaultRetryDelay: 0.01 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("throws non-rate-limit errors immediately", async () => {
    const otherError = new APIResponseError({
      code: APIErrorCode.ObjectNotFound,
      status: 404,
      message: "Other error",
      headers: {},
      rawBodyText: JSON.stringify({ code: "object_not_found" }),
    });

    const fn = vi.fn().mockRejectedValue(otherError);

    await expect(retryOnRateLimit(fn)).rejects.toThrow("Other error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("handles Headers object (browser Headers API)", async () => {
    const headers = new Headers();
    headers.set("retry-after", "0.01"); // Use a very short delay for testing
    const rateLimitError = createRateLimitError(undefined, headers);

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const result = await retryOnRateLimit(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("handles case-insensitive Retry-After header", async () => {
    const rateLimitError = createRateLimitError(undefined, {
      "Retry-After": "0.01", // Use a very short delay for testing
    });

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    const result = await retryOnRateLimit(fn);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("handles invalid Retry-After header value", async () => {
    const rateLimitError = createRateLimitError(undefined, {
      "retry-after": "invalid",
    });

    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("success");

    // Should use defaultRetryDelay when header value is invalid
    const result = await retryOnRateLimit(fn, { defaultRetryDelay: 0.01 });

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
