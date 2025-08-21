import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { runCli } from "./cli.js";

describe("CLI", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  test("ページIDが指定されていない場合にエラーを表示する", async () => {
    try {
      await runCli([]);
    } catch (error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error: Page ID is required");
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("APIキーが環境変数にない場合にエラーを表示する", async () => {
    delete process.env.NOTION_API_KEY;

    try {
      await runCli(["page-123"]);
    } catch (error) {
      // process.exit が呼ばれることを期待
    }

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error: NOTION_API_KEY environment variable is required",
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  test("--api-keyオプションが指定された場合に使用する", async () => {
    // ここではfetchNotionPageのモックが必要だが、
    // 実際のAPIを呼び出さないようにする
    const mockFetchNotionPage = vi.fn().mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }],
    });

    // モジュールをモック
    vi.doMock("../usecase/fetch-notion-page.js", () => ({
      fetchNotionPage: mockFetchNotionPage,
    }));

    try {
      await runCli(["page-123", "--api-key", "test-key"]);
    } catch (error) {
      // 何もしない
    }

    expect(mockFetchNotionPage).toHaveBeenCalledWith("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
    });
  });

  test("--max-depthオプションが指定された場合に使用する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockFetchNotionPage = vi.fn().mockResolvedValue({
      type: "Success",
      value: [{ id: "block-1", type: "paragraph" }],
    });

    vi.doMock("../usecase/fetch-notion-page.js", () => ({
      fetchNotionPage: mockFetchNotionPage,
    }));

    try {
      await runCli(["page-123", "--max-depth", "5"]);
    } catch (error) {
      // 何もしない
    }

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

    const mockFetchNotionPage = vi.fn().mockResolvedValue({
      type: "Success",
      value: mockResponse,
    });

    vi.doMock("../usecase/fetch-notion-page.js", () => ({
      fetchNotionPage: mockFetchNotionPage,
    }));

    await runCli(["page-123"]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      JSON.stringify(mockResponse, null, 2),
    );
  });

  test("エラーレスポンスをJSONエラー形式で出力する", async () => {
    process.env.NOTION_API_KEY = "test-key";

    const mockFetchNotionPage = vi.fn().mockResolvedValue({
      type: "Failure",
      error: {
        kind: "page_not_found",
        pageId: "page-123",
        message: "Page not found",
      },
    });

    vi.doMock("../usecase/fetch-notion-page.js", () => ({
      fetchNotionPage: mockFetchNotionPage,
    }));

    try {
      await runCli(["page-123"]);
    } catch (error) {
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
});
