import assert from "node:assert";
import { describe, it } from "vitest";
import { extractPageIdFromUrl, isNotionUrl } from "./notion-url-parser.js";

describe("extractPageIdFromUrl", () => {
  it("新形式のNotion URLからページIDを抽出できる", () => {
    const url =
      "https://www.notion.so/My-Page-Title-12345678901234567890123456789012";
    const result = extractPageIdFromUrl(url);
    assert.strictEqual(result, "12345678901234567890123456789012");
  });

  it("旧形式のNotion URLからページIDを抽出できる", () => {
    const url =
      "https://www.notion.so/workspace/12345678901234567890123456789012?pvs=4";
    const result = extractPageIdFromUrl(url);
    assert.strictEqual(result, "12345678901234567890123456789012");
  });

  it("直接リンク形式のNotion URLからページIDを抽出できる", () => {
    const url = "https://notion.so/12345678901234567890123456789012";
    const result = extractPageIdFromUrl(url);
    assert.strictEqual(result, "12345678901234567890123456789012");
  });

  it("ハイフン付きのページIDも正しく抽出できる", () => {
    const url =
      "https://www.notion.so/My-Page-Title-12345678-9012-3456-7890-123456789012";
    const result = extractPageIdFromUrl(url);
    assert.strictEqual(result, "12345678-9012-3456-7890-123456789012");
  });

  it("ページIDのみが渡された場合はそのまま返す", () => {
    const pageId = "12345678901234567890123456789012";
    const result = extractPageIdFromUrl(pageId);
    assert.strictEqual(result, pageId);
  });

  it("ハイフン付きページIDのみが渡された場合はそのまま返す", () => {
    const pageId = "12345678-9012-3456-7890-123456789012";
    const result = extractPageIdFromUrl(pageId);
    assert.strictEqual(result, pageId);
  });

  it("無効なURLの場合はnullを返す", () => {
    const invalidUrl = "https://example.com/invalid";
    const result = extractPageIdFromUrl(invalidUrl);
    assert.strictEqual(result, null);
  });

  it("空文字列の場合はnullを返す", () => {
    const result = extractPageIdFromUrl("");
    assert.strictEqual(result, null);
  });
});

describe("isNotionUrl", () => {
  it("Notion URLである場合はtrueを返す", () => {
    const url =
      "https://www.notion.so/My-Page-Title-12345678901234567890123456789012";
    const result = isNotionUrl(url);
    assert.strictEqual(result, true);
  });

  it("notion.so URLである場合はtrueを返す", () => {
    const url = "https://notion.so/12345678901234567890123456789012";
    const result = isNotionUrl(url);
    assert.strictEqual(result, true);
  });

  it("Notion URL以外の場合はfalseを返す", () => {
    const url = "https://example.com/page";
    const result = isNotionUrl(url);
    assert.strictEqual(result, false);
  });

  it("ページIDのみの場合はfalseを返す", () => {
    const pageId = "12345678901234567890123456789012";
    const result = isNotionUrl(pageId);
    assert.strictEqual(result, false);
  });
});
