import { describe, expect, test } from "vitest";
import { fetchNotionPage } from "./fetch-notion-page.js";

describe("fetchNotionPage", () => {
  test("APIキーが空文字列の場合エラーを返す", async () => {
    const result = await fetchNotionPage("page-123", {
      apiKey: "",
    });

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("api_key_missing");
    }
  });

  test("深度制限を超えた場合エラーを返す", async () => {
    const result = await fetchNotionPage("page-123", {
      apiKey: "test-api-key",
      maxDepth: 0,
    });

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("max_depth_exceeded");
    }
  });
});
