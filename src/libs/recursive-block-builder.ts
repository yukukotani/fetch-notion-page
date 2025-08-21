import { Result } from "@praha/byethrow";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { BlockWithChildren, BuildError } from "../types/index.js";
import type { NotionBlockFetcher } from "./notion-block-fetcher.js";

type BuildBlocksOptions = {
  maxDepth: number;
  currentDepth?: number;
};

export async function buildBlockHierarchy(
  blockId: string,
  fetcher: NotionBlockFetcher,
  options: BuildBlocksOptions,
): Promise<Result.Result<BlockWithChildren[], BuildError>> {
  const currentDepth = options.currentDepth ?? 1;

  if (currentDepth > options.maxDepth) {
    return {
      type: "Failure",
      error: {
        kind: "max_depth_exceeded",
        depth: currentDepth,
        message: `Maximum depth of ${options.maxDepth} exceeded`,
      },
    };
  }

  const wrappedFn = Result.try({
    try: async () => {
      const fetchResult = await fetcher.fetchBlocks(blockId);

      if (fetchResult.type === "Failure") {
        throw {
          kind: "fetch_failed",
          blockId,
          message: "Failed to fetch blocks",
          cause: fetchResult.error,
        };
      }

      const blocks = fetchResult.value;

      const childrenResults = await Promise.all(
        blocks.map(async (block: BlockObjectResponse) => {
          const blockWithChildren: BlockWithChildren = { ...block };

          if (block.has_children && currentDepth < options.maxDepth) {
            const childrenResult = await buildBlockHierarchy(
              block.id,
              fetcher,
              {
                ...options,
                currentDepth: currentDepth + 1,
              },
            );

            if (childrenResult.type === "Success") {
              blockWithChildren.children = childrenResult.value;
            } else {
              throw childrenResult.error;
            }
          }

          return blockWithChildren;
        }),
      );

      return childrenResults;
    },
    catch: (error: unknown): BuildError => {
      if (
        typeof error === "object" &&
        error !== null &&
        "kind" in error &&
        typeof error.kind === "string"
      ) {
        return error as BuildError;
      }

      return {
        kind: "api_error",
        message: "Unknown error occurred during block hierarchy building",
        cause: error,
      };
    },
  });

  return wrappedFn();
}
