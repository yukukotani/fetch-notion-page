import type { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { fetchNotionPage } from "./fetch-notion-page.js";

const mockPageResponse: PageObjectResponse = {
  object: "page",
  id: "page-123",
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
            content: "テストページ",
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
          plain_text: "テストページ",
          href: null,
        },
      ],
    },
  },
  url: "https://notion.so/test-page",
  public_url: null,
};

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
          content: "テストコンテンツ",
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
        plain_text: "テストコンテンツ",
        href: null,
      },
    ],
    color: "default",
  },
};

describe("fetchNotionPage E2Eテスト", () => {
  let mockClient: Partial<Client>;

  beforeEach(() => {
    mockClient = {
      pages: {
        retrieve: vi.fn(),
      },
      blocks: {
        children: {
          list: vi.fn(),
        },
      },
    } as any;
  });

  test("ページとブロックの取得が成功する", async () => {
    const mockBlocks = {
      results: [mockBlockResponse],
      next_cursor: null,
      has_more: false,
    };

    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any).mockResolvedValue(mockBlocks);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      // ページ情報をチェック
      expect(result.value.id).toBe("page-123");
      expect(result.value.object).toBe("page");
      if (
        "title" in result.value.properties &&
        result.value.properties.title.type === "title" &&
        result.value.properties.title.title[0]
      ) {
        expect(result.value.properties.title.title[0].plain_text).toBe(
          "テストページ",
        );
      }

      // ブロック階層をチェック
      expect(result.value.children).toHaveLength(1);
      if (result.value.children?.[0]) {
        expect(result.value.children[0].id).toBe("block-1");
        expect(result.value.children[0].type).toBe("paragraph");
      }
    }
  });

  test("再帰的に子ブロックを取得する", async () => {
    const parentBlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "parent-block",
      has_children: true,
    };

    const childBlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "child-block",
      has_children: false,
    };

    const parentBlocks = {
      results: [parentBlockResponse],
      next_cursor: null,
      has_more: false,
    };

    const childBlocks = {
      results: [childBlockResponse],
      next_cursor: null,
      has_more: false,
    };

    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any)
      .mockResolvedValueOnce(parentBlocks)
      .mockResolvedValueOnce(childBlocks);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value.children).toHaveLength(1);
      if (result.value.children?.[0]) {
        expect(result.value.children[0].id).toBe("parent-block");
        expect(result.value.children[0].children).toHaveLength(1);
        if (result.value.children[0].children?.[0]) {
          expect(result.value.children[0].children[0].id).toBe("child-block");
        }
      }
    }
  });

  test("最大深度制限が機能する", async () => {
    const deepBlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "deep-block",
      has_children: true,
    };

    const mockBlocks = {
      results: [deepBlockResponse],
      next_cursor: null,
      has_more: false,
    };

    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any).mockResolvedValue(mockBlocks);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 1,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value.children).toHaveLength(1);
      if (result.value.children?.[0]) {
        expect(result.value.children[0].children).toBeUndefined();
      }
    }
  });

  test("ページ取得エラーが適切に処理される", async () => {
    const error = new Error("Page not found");
    (error as any).code = "object_not_found";
    (mockClient.pages?.retrieve as any).mockRejectedValue(error);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("page_not_found");
    }
  });

  test("ブロック取得エラーが適切に処理される", async () => {
    const error = new Error("API error");
    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any).mockRejectedValue(error);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("network_error");
    }
  });

  test("ページネーションが正しく処理される", async () => {
    const firstBlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "block-1",
    };

    const secondBlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "block-2",
    };

    const firstPage = {
      results: [firstBlockResponse],
      next_cursor: "cursor-123",
      has_more: true,
    };

    const secondPage = {
      results: [secondBlockResponse],
      next_cursor: null,
      has_more: false,
    };

    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value.children).toHaveLength(2);
      if (result.value.children?.[0] && result.value.children[1]) {
        expect(result.value.children[0].id).toBe("block-1");
        expect(result.value.children[1].id).toBe("block-2");
      }
    }

    expect(mockClient.blocks?.children?.list).toHaveBeenCalledTimes(2);
    expect(mockClient.blocks?.children?.list).toHaveBeenNthCalledWith(1, {
      block_id: "page-123",
      page_size: 100,
      start_cursor: undefined,
    });
    expect(mockClient.blocks?.children?.list).toHaveBeenNthCalledWith(2, {
      block_id: "page-123",
      page_size: 100,
      start_cursor: "cursor-123",
    });
  });

  test("深い階層のブロック構造を処理する", async () => {
    const level1BlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "level1-block",
      has_children: true,
    };

    const level2BlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "level2-block",
      has_children: true,
    };

    const level3BlockResponse: BlockObjectResponse = {
      ...mockBlockResponse,
      id: "level3-block",
      has_children: false,
    };

    const level1Blocks = {
      results: [level1BlockResponse],
      next_cursor: null,
      has_more: false,
    };

    const level2Blocks = {
      results: [level2BlockResponse],
      next_cursor: null,
      has_more: false,
    };

    const level3Blocks = {
      results: [level3BlockResponse],
      next_cursor: null,
      has_more: false,
    };

    (mockClient.pages?.retrieve as any).mockResolvedValue(mockPageResponse);
    (mockClient.blocks?.children?.list as any)
      .mockResolvedValueOnce(level1Blocks)
      .mockResolvedValueOnce(level2Blocks)
      .mockResolvedValueOnce(level3Blocks);

    const result = await fetchNotionPage("page-123", {
      apiKey: "test-key",
      maxDepth: 10,
      client: mockClient as Client,
    });

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value.children).toHaveLength(1);
      if (result.value.children?.[0]) {
        expect(result.value.children[0].id).toBe("level1-block");
        expect(result.value.children[0].children).toHaveLength(1);
        if (result.value.children[0].children?.[0]) {
          expect(result.value.children[0].children[0].id).toBe("level2-block");
          expect(result.value.children[0].children[0].children).toHaveLength(1);
          if (result.value.children[0].children[0].children?.[0]) {
            expect(result.value.children[0].children[0].children[0].id).toBe(
              "level3-block",
            );
          }
        }
      }
    }
  });
});
