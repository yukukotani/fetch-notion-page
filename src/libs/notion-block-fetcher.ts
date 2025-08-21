import { Result } from "@praha/byethrow";
import type { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { NotionApiError } from "../types/index.js";

export class NotionBlockFetcher {
  constructor(private readonly client: Client) {}

  async fetchBlocks(
    blockId: string,
  ): Promise<Result.Result<BlockObjectResponse[], NotionApiError>> {
    const wrappedFn = Result.try({
      try: async () => {
        const blocks: BlockObjectResponse[] = [];
        let cursor: string | undefined;

        do {
          const response = await this.client.blocks.children.list({
            block_id: blockId,
            start_cursor: cursor,
            page_size: 100,
          });

          blocks.push(...(response.results as BlockObjectResponse[]));
          cursor = response.next_cursor ?? undefined;
        } while (cursor);

        return blocks;
      },
      catch: (error) => this.handleError(error),
    });

    return wrappedFn();
  }

  private handleError(error: unknown): NotionApiError {
    if (error instanceof Error && "code" in error) {
      const code = (error as any).code;
      switch (code) {
        case "object_not_found":
          return {
            kind: "page_not_found",
            message: error.message,
          };
        case "unauthorized":
          return {
            kind: "unauthorized",
            message: error.message,
          };
        case "rate_limited":
          return {
            kind: "rate_limited",
            message: error.message,
          };
        default:
          return {
            kind: "api_error",
            message: error.message,
            cause: error,
          };
      }
    }

    if (error instanceof Error) {
      return {
        kind: "network_error",
        message: "Failed to fetch blocks",
        cause: error,
      };
    }

    return {
      kind: "api_error",
      message: "Unknown error occurred",
      cause: error,
    };
  }
}
