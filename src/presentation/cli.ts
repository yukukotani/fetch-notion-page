import { parseArgs } from "node:util";
import { fetchNotionPage } from "../usecase/fetch-notion-page.js";

type CliOptions = {
  apiKey?: string | undefined;
  maxDepth?: number | undefined;
};

function showHelp(): void {
  console.log(`
fetch-notion-page - Fetch all blocks from a Notion page recursively

Usage:
  fetch-notion-page <page-id> [options]

Arguments:
  page-id                    Notion page ID to fetch

Options:
  --api-key, -k <key>       Notion API key (overrides NOTION_API_KEY env var)
  --max-depth, -d <depth>   Maximum depth for recursive block fetching (default: 10)
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

    const pageId = positionals[0];
    const options: CliOptions = {};

    if (values["api-key"]) {
      options.apiKey = values["api-key"];
    }

    if (values["max-depth"]) {
      const depth = parseInt(values["max-depth"], 10);
      options.maxDepth = Number.isNaN(depth) ? 10 : depth;
    }

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
    console.error("Error: Page ID is required");
    process.exit(1);
  }

  // API key resolution
  const apiKey = options.apiKey || process.env.NOTION_API_KEY;
  if (!apiKey) {
    console.error("Error: NOTION_API_KEY environment variable is required");
    process.exit(1);
  }

  const maxDepth = options.maxDepth ?? 10;

  try {
    const fetchResult = await fetchNotionPage(pageId, {
      apiKey,
      maxDepth,
    });

    if (fetchResult.type === "Success") {
      console.log(JSON.stringify(fetchResult.value, null, 2));
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
