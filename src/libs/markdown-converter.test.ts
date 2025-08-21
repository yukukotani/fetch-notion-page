import { describe, expect, test } from "vitest";
import type { BlockWithChildren } from "../types/block-with-children.js";
import type { PageWithChildren } from "../types/page-with-children.js";
import { convertPageToMarkdown } from "./markdown-converter.js";

const createMockPage = (title: string): PageWithChildren => ({
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
            content: title,
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
          plain_text: title,
          href: null,
        },
      ],
    },
  },
  url: "https://notion.so/page-1",
  public_url: null,
});

const createParagraphBlock = (text: string): BlockWithChildren => ({
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
          content: text,
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
        plain_text: text,
        href: null,
      },
    ],
    color: "default",
  },
});

const createHeadingBlock = (
  level: 1 | 2 | 3,
  text: string,
): BlockWithChildren => {
  const baseBlock = {
    object: "block" as const,
    id: "block-1",
    has_children: false,
    archived: false,
    in_trash: false,
    created_time: "2023-01-01T00:00:00.000Z",
    last_edited_time: "2023-01-01T00:00:00.000Z",
    created_by: {
      object: "user" as const,
      id: "user-1",
    },
    last_edited_by: {
      object: "user" as const,
      id: "user-1",
    },
    parent: {
      type: "page_id" as const,
      page_id: "page-1",
    },
  };

  const richTextData = {
    rich_text: [
      {
        type: "text" as const,
        text: {
          content: text,
          link: null,
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default" as const,
        },
        plain_text: text,
        href: null,
      },
    ],
    color: "default" as const,
    is_toggleable: false,
  };

  if (level === 1) {
    return {
      ...baseBlock,
      type: "heading_1",
      heading_1: richTextData,
    } as BlockWithChildren;
  }
  if (level === 2) {
    return {
      ...baseBlock,
      type: "heading_2",
      heading_2: richTextData,
    } as BlockWithChildren;
  }
  return {
    ...baseBlock,
    type: "heading_3",
    heading_3: richTextData,
  } as BlockWithChildren;
};

describe("markdown-converter", () => {
  describe("convertPageToMarkdown", () => {
    test("ページタイトルのみの場合、H1として出力される", () => {
      const page = createMockPage("テストページ");

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n");
    });

    test("ページタイトルと段落ブロックがある場合、正しく変換される", () => {
      const page = createMockPage("テストページ");
      page.children = [createParagraphBlock("これは段落です。")];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\nこれは段落です。");
    });

    test("見出しブロックが正しく変換される", () => {
      const page = createMockPage("テストページ");
      page.children = [
        createHeadingBlock(1, "見出し1"),
        createHeadingBlock(2, "見出し2"),
        createHeadingBlock(3, "見出し3"),
      ];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n# 見出し1\n\n## 見出し2\n\n### 見出し3",
      );
    });

    test("リストブロックが正しく変換される", () => {
      const bulletListBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "bulleted_list_item",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        bulleted_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "箇条書き項目", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "箇条書き項目",
              href: null,
            },
          ],
          color: "default",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [bulletListBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n- 箇条書き項目");
    });

    test("コードブロックが正しく変換される", () => {
      const codeBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "code",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        code: {
          rich_text: [
            {
              type: "text",
              text: { content: "console.log('Hello');", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "console.log('Hello');",
              href: null,
            },
          ],
          caption: [],
          language: "javascript",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [codeBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n```javascript\nconsole.log('Hello');\n```",
      );
    });

    test("子ブロックを持つブロックが正しく変換される", () => {
      const parentBlock = createParagraphBlock("親ブロック");
      parentBlock.children = [createParagraphBlock("子ブロック")];

      const page = createMockPage("テストページ");
      page.children = [parentBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n親ブロック\n\n  子ブロック");
    });
  });
});
