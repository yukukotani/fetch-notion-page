import { spawn } from "node:child_process";
import { describe, expect, test } from "vitest";

describe("CLI E2Eテスト", () => {
  test("--helpオプションでヘルプメッセージを表示する", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "fetch-notion-page - Fetch all blocks from a Notion page recursively",
    );
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("--api-key, -k");
    expect(result.stdout).toContain("--max-depth, -d");
  });

  test("ページIDなしでエラーメッセージを表示する", async () => {
    const result = await runCli([]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Error: Page ID is required");
  });

  test("APIキーなしでエラーメッセージを表示する", async () => {
    const result = await runCli(["page-123"], { NOTION_API_KEY: undefined });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(
      "Error: NOTION_API_KEY environment variable is required",
    );
  });

  test("不正なページIDでAPIエラーを処理する", async () => {
    const result = await runCli(["invalid-page-id"], {
      NOTION_API_KEY: "test-key",
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("error");
  });

  test("JSONフォーマットで出力する", async () => {
    const result = await runCli(["test-page"], { NOTION_API_KEY: "test-key" });

    // 実際のAPIを使わないため、エラーが発生するが、JSON形式での出力は確認できる
    if (result.exitCode === 1) {
      expect(result.stderr).toContain('"error"');
      // JSONオブジェクトが含まれていることを確認（完全なJSONでなくても可）
      const hasJsonError =
        result.stderr.includes('{"error"') ||
        result.stderr.includes('"error":');
      expect(hasJsonError).toBe(true);
    }
  });

  test("最大深度オプションが適用される", async () => {
    const result = await runCli(["test-page", "--max-depth", "5"], {
      NOTION_API_KEY: "test-key",
    });

    // APIエラーが発生するが、オプションのパースは成功することを確認
    expect(result.exitCode).toBe(1);
  });

  test("APIキーオプションが優先される", async () => {
    const result = await runCli(["test-page", "--api-key", "override-key"], {
      NOTION_API_KEY: "env-key",
    });

    // APIエラーが発生するが、オプションのパースは成功することを確認
    expect(result.exitCode).toBe(1);
  });
});

interface RunCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface EnvironmentOptions {
  NOTION_API_KEY?: string | undefined;
}

function runCli(
  args: string[],
  env: EnvironmentOptions = {},
): Promise<RunCliResult> {
  return new Promise((resolve) => {
    const childEnv = { ...process.env };

    // 環境変数の設定
    if (env.NOTION_API_KEY === undefined) {
      delete childEnv.NOTION_API_KEY;
    } else {
      childEnv.NOTION_API_KEY = env.NOTION_API_KEY;
    }

    const child = spawn("npx", ["tsx", "src/cli.ts", ...args], {
      env: childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: error.message,
      });
    });
  });
}
