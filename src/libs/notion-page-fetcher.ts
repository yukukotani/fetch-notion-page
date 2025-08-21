import type { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { Result } from "@praha/byethrow";
import type { NotionApiError } from "../types/index.js";

export class NotionPageFetcher {
  constructor(private client: Client) {}

  async fetchPage(
    pageId: string,
  ): Promise<Result.Result<PageObjectResponse, NotionApiError>> {
    const wrappedFn = Result.try({
      try: async (): Promise<PageObjectResponse> => {
        const response = await this.client.pages.retrieve({ page_id: pageId });
        return response as PageObjectResponse;
      },
      catch: (error: unknown): NotionApiError => this.handleError(error),
    });

    return wrappedFn();
  }

  private handleError(error: unknown): NotionApiError {
    if (error instanceof Error && "code" in error) {
      const code = (error as { code: string }).code;
      switch (code) {
        case "object_not_found":
          return {
            kind: "page_not_found",
            pageId: "",
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
            kind: "network_error",
            message: "Failed to fetch page",
            cause: error instanceof Error ? error : new Error(String(error)),
          };
      }
    }

    return {
      kind: "network_error",
      message: "Failed to fetch page",
      cause: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
