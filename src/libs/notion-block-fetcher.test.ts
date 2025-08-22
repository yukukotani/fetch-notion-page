import type { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { NotionBlockFetcher } from "./notion-block-fetcher.js";

const mockBlockResponse: BlockObjectResponse = {
  object: "block",
  id: "block-1",
  type: "paragraph",
  has_children: false,
  archived: false,
  in_trash: false,
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
  parent: {
    type: "page_id",
    page_id: "page-1",
  },
  paragraph: {
    rich_text: [
      {
        type: "text",
        text: {
          content: "Hello World",
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
        plain_text: "Hello World",
        href: null,
      },
    ],
    color: "default",
  },
};

describe("NotionBlockFetcher", () => {
  let mockClient: Partial<Client>;
  let fetcher: NotionBlockFetcher;

  beforeEach(() => {
    mockClient = {
      blocks: {
        children: {
          list: vi.fn(),
        },
      },
    } as any;
    fetcher = new NotionBlockFetcher(mockClient as Client);
  });

  describe("fetchBlocks", () => {
    test("ブロックを正常に取得できる", async () => {
      const mockResponse = {
        results: [mockBlockResponse],
        next_cursor: null,
        has_more: false,
      };

      (mockClient.blocks?.children?.list as any).mockResolvedValue(
        mockResponse,
      );

      const result = await fetcher.fetchBlocks("block-1");

      expect(result.type).toBe("Success");
      if (result.type === "Success") {
        expect(result.value).toEqual([mockBlockResponse]);
      }
    });

    test("ページネーションを正しく処理する", async () => {
      const mockResponse1 = {
        results: [mockBlockResponse],
        next_cursor: "cursor-1",
        has_more: true,
      };

      const mockResponse2 = {
        results: [{ ...mockBlockResponse, id: "block-2" }],
        next_cursor: null,
        has_more: false,
      };

      (mockClient.blocks?.children?.list as any)
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const result = await fetcher.fetchBlocks("block-1");

      expect(result.type).toBe("Success");
      if (result.type === "Success") {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.id).toBe("block-1");
        expect(result.value[1]?.id).toBe("block-2");
      }

      expect(mockClient.blocks?.children?.list).toHaveBeenCalledTimes(2);
      expect(mockClient.blocks?.children?.list).toHaveBeenNthCalledWith(1, {
        block_id: "block-1",
        start_cursor: undefined,
        page_size: 100,
      });
      expect(mockClient.blocks?.children?.list).toHaveBeenNthCalledWith(2, {
        block_id: "block-1",
        start_cursor: "cursor-1",
        page_size: 100,
      });
    });

    test("404エラーを適切に処理する", async () => {
      const error = new Error("Object not found");
      (error as any).code = "object_not_found";
      (mockClient.blocks?.children?.list as any).mockRejectedValue(error);

      const result = await fetcher.fetchBlocks("invalid-block-id");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("page_not_found");
        expect(result.error.message).toBe("Object not found");
      }
    });

    test("認証エラーを適切に処理する", async () => {
      const error = new Error("Unauthorized");
      (error as any).code = "unauthorized";
      (mockClient.blocks?.children?.list as any).mockRejectedValue(error);

      const result = await fetcher.fetchBlocks("block-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("unauthorized");
        expect(result.error.message).toBe("Unauthorized");
      }
    });

    test("レート制限エラーを適切に処理する", async () => {
      const error = new Error("Rate limited");
      (error as any).code = "rate_limited";
      (mockClient.blocks?.children?.list as any).mockRejectedValue(error);

      const result = await fetcher.fetchBlocks("block-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("rate_limited");
        expect(result.error.message).toBe("Rate limited");
      }
    });

    test("ネットワークエラーを適切に処理する", async () => {
      const error = new Error("Network error");
      (mockClient.blocks?.children?.list as any).mockRejectedValue(error);

      const result = await fetcher.fetchBlocks("block-1");

      expect(result.type).toBe("Failure");
      if (result.type === "Failure") {
        expect(result.error.kind).toBe("network_error");
        expect(result.error.message).toBe("Failed to fetch blocks");
        if (result.error.kind === "network_error") {
          expect(result.error.cause).toBe(error);
        }
      }
    });
  });
});
