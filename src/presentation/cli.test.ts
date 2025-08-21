import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import * as markdownConverterModule from "../libs/markdown-converter.js";
import * as fetchNotionPageModule from "../usecase/fetch-notion-page.js";
import { runCli } from "./cli.js";

describe("CLI", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;
  let fetchNotionPageSpy: any;
  let convertPageToMarkdownSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    fetchNotionPageSpy = vi.spyOn(fetchNotionPageModule, "fetchNotionPage");
    convertPageToMarkdownSpy = vi.spyOn(
      markdownConverterModule,
      "convertPageToMarkdown",
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    fetchNotionPageSpy.mockRestore();
    convertPageToMarkdownSpy.mockRestore();
  });

  test("ページIDが指定されていない場合にエラーを表示する", async () => {
    try {
      await runCli([]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: Valid Notion page ID or URL is required",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("APIキーが環境変数にない場合にエラーを表示する", async () => {
    delete process.env.NOTION_API_KEY;

    try {
      await runCli(["12345678901234567890123456789012"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: NOTION_API_KEY environment variable is required",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("--api-keyオプションが指定された場合に使用する", async () => {
    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli(["12345678901234567890123456789012", "--api-key", "test-key"]);

    expect(fetchNotionPageSpy).toHaveBeenCalledWith(
      "12345678901234567890123456789012",
      {
        apiKey: "test-key",
        maxDepth: 10,
      },
    );
  });

  test("--max-depthオプションが指定された場合に使用する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli(["12345678901234567890123456789012", "--max-depth", "5"]);

    expect(fetchNotionPageSpy).toHaveBeenCalledWith(
      "12345678901234567890123456789012",
      {
        apiKey: "test-key",
        maxDepth: 5,
      },
    );
  });

  test("正常なレスポンスをJSON形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockResponse = [
      {
        id: "block-1",
        type: "paragraph",
        children: [{ id: "child-1", type: "text" }],
      },
    ];

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    await runCli(["12345678901234567890123456789012"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResponse, null, 2),
    );
  });

  test("エラーレスポンスをJSONエラー形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    fetchNotionPageSpy.mockResolvedValue({
      type: "Failure",
      error: {
        kind: "page_not_found",
        pageId: "12345678901234567890123456789012",
        message: "Page not found",
      } as any,
    });

    try {
      await runCli(["12345678901234567890123456789012"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          error: {
            kind: "page_not_found",
            pageId: "12345678901234567890123456789012",
            message: "Page not found",
          },
        },
        null,
        2,
      ),
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("--formatオプションでjsonが指定された場合、JSON形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockResponse = {
      id: "page-1",
      properties: {
        title: {
          type: "title",
          title: [{ plain_text: "テストページ" }],
        },
      },
      children: [{ id: "block-1", type: "paragraph" }],
    };

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    await runCli(["12345678901234567890123456789012", "--format", "json"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResponse, null, 2),
    );
  });

  test("--formatオプションでmarkdownが指定された場合、Markdown形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockResponse = {
      id: "page-1",
      properties: {
        title: {
          type: "title",
          title: [{ plain_text: "テストページ" }],
        },
      },
      children: [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: {
            rich_text: [{ plain_text: "これは段落です。" }],
          },
        },
      ],
    };

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    convertPageToMarkdownSpy.mockReturnValue(
      "# テストページ\n\nこれは段落です。",
    );

    await runCli(["12345678901234567890123456789012", "--format", "markdown"]);

    expect(convertPageToMarkdownSpy).toHaveBeenCalledWith(mockResponse);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "# テストページ\n\nこれは段落です。",
    );
  });

  test("無効な--formatオプションが指定された場合にエラーを表示する", async () => {
    try {
      await runCli(["12345678901234567890123456789012", "--format", "invalid"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing arguments:",
      "Invalid format: invalid. Must be 'json' or 'markdown'",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("新形式のNotion URLが指定された場合にページIDを抽出して処理する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli([
      "https://www.notion.so/My-Page-Title-12345678901234567890123456789012",
    ]);

    expect(fetchNotionPageSpy).toHaveBeenCalledWith(
      "12345678901234567890123456789012",
      {
        apiKey: "test-key",
        maxDepth: 10,
      },
    );
  });

  test("旧形式のNotion URLが指定された場合にページIDを抽出して処理する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli([
      "https://www.notion.so/workspace/12345678901234567890123456789012?pvs=4",
    ]);

    expect(fetchNotionPageSpy).toHaveBeenCalledWith(
      "12345678901234567890123456789012",
      {
        apiKey: "test-key",
        maxDepth: 10,
      },
    );
  });

  test("直接リンク形式のNotion URLが指定された場合にページIDを抽出して処理する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    fetchNotionPageSpy.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli(["https://notion.so/12345678901234567890123456789012"]);

    expect(fetchNotionPageSpy).toHaveBeenCalledWith(
      "12345678901234567890123456789012",
      {
        apiKey: "test-key",
        maxDepth: 10,
      },
    );
  });

  test("無効なURLが指定された場合にエラーを表示する", async () => {
    try {
      await runCli(["https://example.com/invalid"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: Valid Notion page ID or URL is required",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
