import { Client } from "@notionhq/client";
import { Result } from "@praha/byethrow";
import { NotionBlockFetcher } from "../libs/notion-block-fetcher.js";
import { buildBlockHierarchy } from "../libs/recursive-block-builder.js";
import type {
  BlockWithChildren,
  FetchNotionPageError,
} from "../types/index.js";

type FetchNotionPageOptions = {
  apiKey: string;
  maxDepth?: number;
  includePageInfo?: boolean;
};

export async function fetchNotionPage(
  pageId: string,
  options: FetchNotionPageOptions,
): Promise<Result.Result<BlockWithChildren[], FetchNotionPageError>> {
  if (!options.apiKey || options.apiKey.trim() === "") {
    return {
      type: "Failure",
      error: {
        kind: "api_key_missing",
        message: "API key is required but not provided",
      },
    };
  }

  const maxDepth = options.maxDepth ?? 10;

  if (maxDepth < 1) {
    return {
      type: "Failure",
      error: {
        kind: "max_depth_exceeded",
        depth: maxDepth,
        message: "Max depth must be at least 1",
      },
    };
  }

  const wrappedFn = Result.try({
    try: async () => {
      const client = new Client({ auth: options.apiKey });
      const fetcher = new NotionBlockFetcher(client);

      const buildResult = await buildBlockHierarchy(pageId, fetcher, {
        maxDepth,
      });

      if (buildResult.type === "Failure") {
        const buildError = buildResult.error;

        switch (buildError.kind) {
          case "max_depth_exceeded":
            throw {
              kind: "max_depth_exceeded",
              depth: buildError.depth,
              message: buildError.message,
            };
          case "fetch_failed":
            if (
              buildError.cause &&
              typeof buildError.cause === "object" &&
              "kind" in buildError.cause
            ) {
              const notionError = buildError.cause as any;
              switch (notionError.kind) {
                case "page_not_found":
                  throw {
                    kind: "page_not_found",
                    pageId,
                    message: notionError.message,
                  };
                case "unauthorized":
                  throw {
                    kind: "unauthorized",
                    message: notionError.message,
                  };
                case "rate_limited":
                  throw {
                    kind: "rate_limited",
                    message: notionError.message,
                  };
                case "network_error":
                  throw {
                    kind: "network_error",
                    message: notionError.message,
                    cause: notionError.cause,
                  };
                default:
                  throw {
                    kind: "unknown",
                    message: buildError.message,
                    cause: buildError.cause,
                  };
              }
            }
            throw {
              kind: "unknown",
              message: buildError.message,
              cause: buildError.cause,
            };
          default:
            throw {
              kind: "unknown",
              message: buildError.message,
              cause: buildError,
            };
        }
      }

      return buildResult.value;
    },
    catch: (error: unknown): FetchNotionPageError => {
      if (
        typeof error === "object" &&
        error !== null &&
        "kind" in error &&
        typeof error.kind === "string"
      ) {
        return error as FetchNotionPageError;
      }

      return {
        kind: "unknown",
        message: "An unexpected error occurred",
        cause: error,
      };
    },
  });

  return wrappedFn();
}
