import type { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotionPageFetcher } from "./notion-page-fetcher.js";

const mockPageResponse: PageObjectResponse = {
  object: "page",
  id: "page-1",
  created_time: "2023-01-01T00:00:00.000Z",
  last_edited_time: "2023-01-01T00:00:00.000Z",
  created_by: {
    object: "user",
    id: "user-1",
  },
  last_edited_by: {
    object: "user",
    id: "user-1",
  },
  cover: null,
  icon: null,
  parent: {
    type: "workspace",
    workspace: true,
  },
  archived: false,
  in_trash: false,
  properties: {
    title: {
      id: "title",
      type: "title",
      title: [
        {
          type: "text",
          text: {
            content: "Test Page",
            link: null,
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          plain_text: "Test Page",
          href: null,
        },
      ],
    },
  },
  url: "https://notion.so/test-page",
  public_url: null,
};

describe("NotionPageFetcher", () => {
  let mockClient: Partial<Client>;
  let fetcher: NotionPageFetcher;

  beforeEach(() => {
    mockClient = {
      pages: {
        retrieve: vi.fn(),
      },
    } as any;
    fetcher = new NotionPageFetcher(mockClient as Client);
  });

  describe("fetchPage", () => {
    test("ページを正常に取得できる", async () => {
      (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);

      const result = await fetcher.fetchPage("page-1");

      expect(result.type).toBe("Success");
      if (result.type === "Success") {
        expect(result.value).toEqual(mockPageResponse);
      }
    });

    test("404エラーを適切に処理する", async () => {
      const error = new Error("Object not found");
      (error as any).code = "object_not_found";
      (mockClient.pages?.retrieve as any).mockRejectedValue(error);

      const result = await fetcher.fetchPage("invalid-page-id");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("page_not_found");
        expect(result.error.message).toBe("Object not found");
      }
    });

    test("認証エラーを適切に処理する", async () => {
      const error = new Error("Unauthorized");
      (error as any).code = "unauthorized";
      (mockClient.pages?.retrieve as any).mockRejectedValue(error);

      const result = await fetcher.fetchPage("page-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("unauthorized");
        expect(result.error.message).toBe("Unauthorized");
      }
    });

    test("レート制限エラーを適切に処理する", async () => {
      const error = new Error("Rate limited");
      (error as any).code = "rate_limited";
      (mockClient.pages?.retrieve as any).mockRejectedValue(error);

      const result = await fetcher.fetchPage("page-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("rate_limited");
        expect(result.error.message).toBe("Rate limited");
      }
    });

    test("ネットワークエラーを適切に処理する", async () => {
      const error = new Error("Network error");
      (mockClient.pages?.retrieve as any).mockRejectedValue(error);

      const result = await fetcher.fetchPage("page-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("network_error");
        expect(result.error.message).toBe("Failed to fetch page");
        if (result.error.kind === "network_error") {
          expect(result.error.cause).toBe(error);
        }
      }
    });
  });
});
