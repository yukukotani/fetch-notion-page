import { parseArgs } from "node:util";
import { convertPageToMarkdown } from "../libs/markdown-converter.js";
import { extractPageIdFromUrl } from "../libs/notion-url-parser.js";
import { fetchNotionPage } from "../usecase/fetch-notion-page.js";

type CliOptions = {
  apiKey?: string | undefined;
  maxDepth?: number | undefined;
  maxRetries?: number | undefined;
  format?: "json" | "markdown" | undefined;
};

function showHelp(): void {
  console.log(`
fetch-notion-page - Fetch all blocks from a Notion page recursively

Usage:
  fetch-notion-page <page-id-or-url> [options]

Arguments:
  page-id-or-url            Notion page ID or URL to fetch
                            Examples:
                            - 12345678901234567890123456789012
                            - https://www.notion.so/My-Page-12345678901234567890123456789012
                            - https://notion.so/12345678901234567890123456789012

Options:
  --api-key, -k <key>       Notion API key (overrides NOTION_API_KEY env var)
  --max-depth, -d <depth>   Maximum depth for recursive block fetching (default: 10)
  --max-retries, -r <num>   Maximum number of retries for rate limit errors (default: 3)
  --format, -f <format>     Output format: json (default) or markdown
  --help, -h                Show this help message

Environment Variables:
  NOTION_API_KEY            Notion API key (required if --api-key not provided)
`);
}

function parseCliArgs(args: string[]): {
  pageId?: string | undefined;
  options: CliOptions;
} {
  try {
    const { values, positionals } = parseArgs({
      args,
      options: {
        "api-key": {
          type: "string",
          short: "k",
        },
        "max-depth": {
          type: "string",
          short: "d",
        },
        "max-retries": {
          type: "string",
          short: "r",
        },
        format: {
          type: "string",
          short: "f",
        },
        help: {
          type: "boolean",
          short: "h",
        },
      },
      allowPositionals: true,
    });

    if (values.help) {
      showHelp();
      process.exit(0);
    }

    const pageIdOrUrl = positionals[0];
    const options: CliOptions = {};

    if (values["api-key"]) {
      options.apiKey = values["api-key"];
    }

    if (values["max-depth"]) {
      const depth = parseInt(values["max-depth"], 10);
      options.maxDepth = Number.isNaN(depth) ? 10 : depth;
    }

    if (values["max-retries"]) {
      const retries = parseInt(values["max-retries"], 10);
      options.maxRetries = Number.isNaN(retries) ? undefined : retries;
    }

    if (values.format) {
      if (values.format === "json" || values.format === "markdown") {
        options.format = values.format;
      } else {
        throw new Error(
          `Invalid format: ${values.format}. Must be 'json' or 'markdown'`,
        );
      }
    }

    // ページIDまたはURLからページIDを抽出
    const pageId = pageIdOrUrl
      ? extractPageIdFromUrl(pageIdOrUrl) || undefined
      : undefined;

    return { pageId, options };
  } catch (error) {
    console.error(
      "Error parsing arguments:",
      error instanceof Error ? error.message : error,
    );
    showHelp();
    process.exit(1);
  }
}

export async function runCli(args: string[]): Promise<void> {
  const { pageId, options } = parseCliArgs(args);

  // Page ID validation
  if (!pageId) {
    console.error("Error: Valid Notion page ID or URL is required");
    console.error("Please provide a Notion page ID or URL.");
    console.error("Examples:");
    console.error("  - 12345678901234567890123456789012");
    console.error(
      "  - https://www.notion.so/My-Page-12345678901234567890123456789012",
    );
    process.exit(1);
  }

  // API key resolution
  const apiKey = options.apiKey || process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.error("Error: NOTION_API_KEY environment variable is required");
    process.exit(1);
  }

  const maxDepth = options.maxDepth ?? 10;
  const format = options.format ?? "json";

  try {
    const fetchOptions: {
      apiKey: string;
      maxDepth: number;
      maxRetries?: number;
    } = {
      apiKey,
      maxDepth,
    };
    if (options.maxRetries !== undefined) {
      fetchOptions.maxRetries = options.maxRetries;
    }

    const fetchResult = await fetchNotionPage(pageId, fetchOptions);

    if (fetchResult.type === "Success") {
      if (format === "markdown") {
        const markdown = convertPageToMarkdown(fetchResult.value);
        console.log(markdown);
      } else {
        console.log(JSON.stringify(fetchResult.value, null, 2));
      }
    } else {
      console.error(
        JSON.stringify(
          {
            error: fetchResult.error,
          },
          null,
          2,
        ),
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

export function extractCliArgs(argv: string[]): string[] {
  return argv.slice(2);
}

export function handleCli(args: string[]): void {
  runCli(args).catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
