import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { convertPageToMarkdown } from "../libs/markdown-converter.js";
import { fetchNotionPage } from "../usecase/fetch-notion-page.js";
import { runCli } from "./cli.js";

// モジュールをモック
vi.mock("../usecase/fetch-notion-page.js");
vi.mock("../libs/markdown-converter.js");

describe("CLI", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    // モックをリセット
    vi.mocked(fetchNotionPage).mockReset();
    vi.mocked(convertPageToMarkdown).mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test("ページIDが指定されていない場合にエラーを表示する", async () => {
    try {
      await runCli([]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error: Page ID is required");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("APIキーが環境変数にない場合にエラーを表示する", async () => {
    delete process.env.NOTION_API_KEY;

    try {
      await runCli(["page-123"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: NOTION_API_KEY environment variable is required",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("--api-keyオプションが指定された場合に使用する", async () => {
    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli(["page-123", "--api-key", "test-key"]);

    expect(mockFetchNotionPage).toHaveBeenCalledWith("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
    });
  });

  test("--max-depthオプションが指定された場合に使用する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }] as any,
    });

    await runCli(["page-123", "--max-depth", "5"]);

    expect(mockFetchNotionPage).toHaveBeenCalledWith("page-123", {
      apiKey: "test-key",
      maxDepth: 5,
    });
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

    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    await runCli(["page-123"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResponse, null, 2),
    );
  });

  test("エラーレスポンスをJSONエラー形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Failure",
      error: {
        kind: "page_not_found",
        pageId: "page-123",
        message: "Page not found",
      } as any,
    });

    try {
      await runCli(["page-123"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      JSON.stringify(
        {
          error: {
            kind: "page_not_found",
            pageId: "page-123",
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

    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    await runCli(["page-123", "--format", "json"]);

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

    const mockFetchNotionPage = vi.mocked(fetchNotionPage);
    mockFetchNotionPage.mockResolvedValue({
      type: "Success",
      value: mockResponse as any,
    });

    const mockConvertPageToMarkdown = vi.mocked(convertPageToMarkdown);
    mockConvertPageToMarkdown.mockReturnValue(
      "# テストページ\n\nこれは段落です。",
    );

    await runCli(["page-123", "--format", "markdown"]);

    expect(mockConvertPageToMarkdown).toHaveBeenCalledWith(mockResponse);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "# テストページ\n\nこれは段落です。",
    );
  });

  test("無効な--formatオプションが指定された場合にエラーを表示する", async () => {
    try {
      await runCli(["page-123", "--format", "invalid"]);
    } catch (_error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error parsing arguments:",
      "Invalid format: invalid. Must be 'json' or 'markdown'",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});
