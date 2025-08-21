import { fetchNotionPage } from "../usecase/fetch-notion-page.js";

type CliOptions = {
  apiKey?: string;
  maxDepth?: number;
};

function parseCliArgs(args: string[]): {
  pageId?: string;
  options: CliOptions;
} {
  const options: CliOptions = {};
  let pageId: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--api-key" || arg === "-k") {
      options.apiKey = args[i + 1];
      i++; // skip next argument
    } else if (arg === "--max-depth" || arg === "-d") {
      const depth = parseInt(args[i + 1] || "10", 10);
      options.maxDepth = isNaN(depth) ? 10 : depth;
      i++; // skip next argument
    } else if (arg === "--help" || arg === "-h") {
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
      process.exit(0);
    } else if (!pageId && !arg.startsWith("-")) {
      pageId = arg;
    }
  }

  return { pageId, options };
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

export function parseArgs(argv: string[]): string[] {
  return argv.slice(2);
}

export function handleCli(args: string[]): void {
  runCli(args).catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}
