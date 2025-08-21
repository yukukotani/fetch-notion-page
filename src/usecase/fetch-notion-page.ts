import type { Client } from "@notionhq/client";
import { Client as NotionClient } from "@notionhq/client";
import { Result } from "@praha/byethrow";
import { NotionBlockFetcher } from "../libs/notion-block-fetcher.js";
import { NotionPageFetcher } from "../libs/notion-page-fetcher.js";
import { buildBlockHierarchy } from "../libs/recursive-block-builder.js";
import type {
  FetchNotionPageError,
  NotionApiError,
  PageWithChildren,
} from "../types/index.js";

type FetchNotionPageOptions = {
  apiKey: string;
  maxDepth?: number;
  client?: Client; // テスト用のクライアント注入
};

export async function fetchNotionPage(
  pageId: string,
  options: FetchNotionPageOptions,
): Promise<Result.Result<PageWithChildren, FetchNotionPageError>> {
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
      const client =
        options.client || new NotionClient({ auth: options.apiKey });
      const blockFetcher = new NotionBlockFetcher(client);
      const pageFetcher = new NotionPageFetcher(client);

      // ページ情報を取得
      const pageResult = await pageFetcher.fetchPage(pageId);
      if (pageResult.type === "Failure") {
        const pageError = pageResult.error;
        switch (pageError.kind) {
          case "page_not_found":
            throw {
              kind: "page_not_found",
              pageId,
              message: pageError.message,
            };
          case "unauthorized":
            throw {
              kind: "unauthorized",
              message: pageError.message,
            };
          case "rate_limited":
            throw {
              kind: "rate_limited",
              message: pageError.message,
            };
          case "network_error":
            throw {
              kind: "network_error",
              message: pageError.message,
              cause: pageError.cause,
            };
          default:
            throw {
              kind: "unknown",
              message: pageError.message,
              cause: pageError,
            };
        }
      }

      // ブロック階層を取得
      const buildResult = await buildBlockHierarchy(pageId, blockFetcher, {
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
              const notionError = buildError.cause as NotionApiError;
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

      // ページ情報とブロック階層を組み合わせ
      const pageWithChildren: PageWithChildren = {
        ...pageResult.value,
        children: buildResult.value,
      };

      return pageWithChildren;
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
