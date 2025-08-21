import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { BuildError } from "../types/index.js";
import type { NotionBlockFetcher } from "./notion-block-fetcher.js";
import { buildBlockHierarchy } from "./recursive-block-builder.js";

const createMockBlock = (
  id: string,
  hasChildren = false,
): BlockObjectResponse => ({
  object: "block",
  id,
  type: "paragraph",
  has_children: hasChildren,
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
          content: `Block ${id}`,
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
        plain_text: `Block ${id}`,
        href: null,
      },
    ],
    color: "default",
  },
});

describe("buildBlockHierarchy", () => {
  let mockFetcher: Partial<NotionBlockFetcher>;

  beforeEach(() => {
    mockFetcher = {
      fetchBlocks: vi.fn(),
    };
  });

  test("ネストなしブロックを正常に取得する", async () => {
    const blocks = [
      createMockBlock("block-1", false),
      createMockBlock("block-2", false),
    ];

    (mockFetcher.fetchBlocks as any).mockResolvedValue({
      type: "Success",
      value: blocks,
    });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 10 },
    );

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.id).toBe("block-1");
      expect(result.value[1]?.id).toBe("block-2");
      expect(result.value[0]?.children).toBeUndefined();
      expect(result.value[1]?.children).toBeUndefined();
    }
  });

  test("1階層ネストブロックを正常に取得する", async () => {
    const parentBlock = createMockBlock("parent-1", true);
    const childBlocks = [
      createMockBlock("child-1", false),
      createMockBlock("child-2", false),
    ];

    (mockFetcher.fetchBlocks as any)
      .mockResolvedValueOnce({
        type: "Success",
        value: [parentBlock],
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: childBlocks,
      });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 10 },
    );

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("parent-1");
      expect(result.value[0]?.children).toHaveLength(2);
      expect(result.value[0]?.children?.[0]?.id).toBe("child-1");
      expect(result.value[0]?.children?.[1]?.id).toBe("child-2");
    }

    expect(mockFetcher.fetchBlocks).toHaveBeenCalledTimes(2);
    expect(mockFetcher.fetchBlocks).toHaveBeenNthCalledWith(1, "page-1");
    expect(mockFetcher.fetchBlocks).toHaveBeenNthCalledWith(2, "parent-1");
  });

  test("多階層ネストブロックを正常に取得する", async () => {
    const level1Block = createMockBlock("level1-1", true);
    const level2Block = createMockBlock("level2-1", true);
    const level3Blocks = [
      createMockBlock("level3-1", false),
      createMockBlock("level3-2", false),
    ];

    (mockFetcher.fetchBlocks as any)
      .mockResolvedValueOnce({
        type: "Success",
        value: [level1Block],
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: [level2Block],
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: level3Blocks,
      });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 10 },
    );

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("level1-1");
      expect(result.value[0]?.children).toHaveLength(1);
      expect(result.value[0]?.children?.[0]?.id).toBe("level2-1");
      expect(result.value[0]?.children?.[0]?.children).toHaveLength(2);
      expect(result.value[0]?.children?.[0]?.children?.[0]?.id).toBe(
        "level3-1",
      );
      expect(result.value[0]?.children?.[0]?.children?.[1]?.id).toBe(
        "level3-2",
      );
    }
  });

  test("深度制限を適切に処理する", async () => {
    const level1Block = createMockBlock("level1-1", true);
    const level2Block = createMockBlock("level2-1", true);

    (mockFetcher.fetchBlocks as any)
      .mockResolvedValueOnce({
        type: "Success",
        value: [level1Block],
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: [level2Block],
      });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 2 },
    );

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.id).toBe("level1-1");
      expect(result.value[0]?.children).toHaveLength(1);
      expect(result.value[0]?.children?.[0]?.id).toBe("level2-1");
      expect(result.value[0]?.children?.[0]?.children).toBeUndefined();
    }

    expect(mockFetcher.fetchBlocks).toHaveBeenCalledTimes(2);
  });

  test("深度制限を超えた場合エラーを返す", async () => {
    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 0 },
    );

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("max_depth_exceeded");
      expect(result.error.depth).toBe(1);
    }
  });

  test("フェッチエラーを適切に処理する", async () => {
    const apiError: BuildError = {
      kind: "api_error",
      message: "API Error",
    };

    (mockFetcher.fetchBlocks as any).mockResolvedValue({
      type: "Failure",
      error: apiError,
    });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 10 },
    );

    expect(result.type).toBe("Failure");
    if (result.type === "Failure") {
      expect(result.error.kind).toBe("fetch_failed");
      expect(result.error.blockId).toBe("page-1");
    }
  });

  test("並列処理で複数の子ブロックを取得する", async () => {
    const parentBlocks = [
      createMockBlock("parent-1", true),
      createMockBlock("parent-2", true),
    ];
    const child1Blocks = [createMockBlock("child-1-1", false)];
    const child2Blocks = [createMockBlock("child-2-1", false)];

    (mockFetcher.fetchBlocks as any)
      .mockResolvedValueOnce({
        type: "Success",
        value: parentBlocks,
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: child1Blocks,
      })
      .mockResolvedValueOnce({
        type: "Success",
        value: child2Blocks,
      });

    const result = await buildBlockHierarchy(
      "page-1",
      mockFetcher as NotionBlockFetcher,
      { maxDepth: 10 },
    );

    expect(result.type).toBe("Success");
    if (result.type === "Success") {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]?.children).toHaveLength(1);
      expect(result.value[1]?.children).toHaveLength(1);
      expect(result.value[0]?.children?.[0]?.id).toBe("child-1-1");
      expect(result.value[1]?.children?.[0]?.id).toBe("child-2-1");
    }

    expect(mockFetcher.fetchBlocks).toHaveBeenCalledTimes(3);
  });
});
