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

    test("Rich textのアノテーション（太字、斜体、下線、コード）が正しく変換される", () => {
      const richTextBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "paragraph",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "太字", link: null },
              annotations: {
                bold: true,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "太字",
              href: null,
            },
            {
              type: "text",
              text: { content: " と ", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: " と ",
              href: null,
            },
            {
              type: "text",
              text: { content: "斜体", link: null },
              annotations: {
                bold: false,
                italic: true,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "斜体",
              href: null,
            },
            {
              type: "text",
              text: { content: " と ", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: " と ",
              href: null,
            },
            {
              type: "text",
              text: { content: "下線", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: true,
                code: false,
                color: "default",
              },
              plain_text: "下線",
              href: null,
            },
            {
              type: "text",
              text: { content: " と ", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: " と ",
              href: null,
            },
            {
              type: "text",
              text: { content: "コード", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: true,
                color: "default",
              },
              plain_text: "コード",
              href: null,
            },
          ],
          color: "default",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [richTextBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n**太字** と *斜体* と <u>下線</u> と `コード`",
      );
    });

    test("Rich textのリンクが正しく変換される", () => {
      const linkBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "paragraph",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "これはリンクです", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "これはリンクです",
              href: "https://example.com",
            },
          ],
          color: "default",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [linkBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[これはリンクです](https://example.com)",
      );
    });

    test("画像ブロックが正しく変換される", () => {
      const imageBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "image",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        image: {
          type: "external",
          external: {
            url: "https://example.com/image.png",
          },
          caption: [
            {
              type: "text",
              text: { content: "サンプル画像", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "サンプル画像",
              href: null,
            },
          ],
        },
      };

      const page = createMockPage("テストページ");
      page.children = [imageBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n![サンプル画像](https://example.com/image.png)",
      );
    });

    test("ファイルブロックが正しく変換される", () => {
      const fileBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "file",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        file: {
          type: "external",
          external: {
            url: "https://example.com/document.pdf",
          },
          caption: [],
          name: "重要な文書.pdf",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [fileBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[📎 重要な文書.pdf](https://example.com/document.pdf)",
      );
    });

    test("動画ブロックが正しく変換される", () => {
      const videoBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "video",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        video: {
          type: "external",
          external: {
            url: "https://www.youtube.com/watch?v=example",
          },
          caption: [],
        },
      };

      const page = createMockPage("テストページ");
      page.children = [videoBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[🎬 Video](https://www.youtube.com/watch?v=example)",
      );
    });

    test("テーブルブロックが正しく変換される（ヘッダーなし）", () => {
      const tableRowBlock1: BlockWithChildren = {
        object: "block",
        id: "row-1",
        type: "table_row",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "table-1" },
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "セル1", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "セル1",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "セル2", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "セル2",
                href: null,
              },
            ],
          ],
        },
      };

      const tableRowBlock2: BlockWithChildren = {
        object: "block",
        id: "row-2",
        type: "table_row",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "table-1" },
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "セル3", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "セル3",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "セル4", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "セル4",
                href: null,
              },
            ],
          ],
        },
      };

      const tableBlock: BlockWithChildren = {
        object: "block",
        id: "table-1",
        type: "table",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        table: {
          table_width: 2,
          has_column_header: false,
          has_row_header: false,
        },
        children: [tableRowBlock1, tableRowBlock2],
      };

      const page = createMockPage("テストページ");
      page.children = [tableBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n| セル1 | セル2 |\n| セル3 | セル4 |",
      );
    });

    test("テーブルブロックが正しく変換される（ヘッダーあり）", () => {
      const headerRowBlock: BlockWithChildren = {
        object: "block",
        id: "header-row",
        type: "table_row",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "table-1" },
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "列1", link: null },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "列1",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "列2", link: null },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "列2",
                href: null,
              },
            ],
          ],
        },
      };

      const dataRowBlock: BlockWithChildren = {
        object: "block",
        id: "data-row",
        type: "table_row",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "table-1" },
        table_row: {
          cells: [
            [
              {
                type: "text",
                text: { content: "データ1", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "データ1",
                href: null,
              },
            ],
            [
              {
                type: "text",
                text: { content: "データ2", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "データ2",
                href: null,
              },
            ],
          ],
        },
      };

      const tableWithHeaderBlock: BlockWithChildren = {
        object: "block",
        id: "table-1",
        type: "table",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
        },
        children: [headerRowBlock, dataRowBlock],
      };

      const page = createMockPage("テストページ");
      page.children = [tableWithHeaderBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n| **列1** | **列2** |\n| --- | --- |\n| データ1 | データ2 |",
      );
    });

    test("ブックマークブロックが正しく変換される", () => {
      const bookmarkBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "bookmark",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        bookmark: {
          url: "https://example.com",
          caption: [
            {
              type: "text",
              text: { content: "参考サイト", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "参考サイト",
              href: null,
            },
          ],
        },
      };

      const page = createMockPage("テストページ");
      page.children = [bookmarkBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[🔖 参考サイト](https://example.com)",
      );
    });

    test("埋め込みブロックが正しく変換される", () => {
      const embedBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "embed",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        embed: {
          url: "https://www.figma.com/embed/example",
          caption: [],
        },
      };

      const page = createMockPage("テストページ");
      page.children = [embedBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[🔗 Embed](https://www.figma.com/embed/example)",
      );
    });

    test("リンクプレビューブロックが正しく変換される", () => {
      const linkPreviewBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "link_preview",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        link_preview: {
          url: "https://github.com/example/repo/pull/123",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [linkPreviewBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n[🔗 Link Preview](https://github.com/example/repo/pull/123)",
      );
    });

    test("子ページブロックが正しく変換される", () => {
      const childPageBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "child_page",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        child_page: {
          title: "子ページのタイトル",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [childPageBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n📄 子ページのタイトル");
    });

    test("子データベースブロックが正しく変換される", () => {
      const childDatabaseBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "child_database",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        child_database: {
          title: "タスク管理データベース",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [childDatabaseBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n🗃️ タスク管理データベース");
    });

    test("カラムリストブロックが正しく変換される", () => {
      const column1: BlockWithChildren = {
        object: "block",
        id: "column-1",
        type: "column",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "column-list-1" },
        column: {},
        children: [createParagraphBlock("左カラムの内容")],
      };

      const column2: BlockWithChildren = {
        object: "block",
        id: "column-2",
        type: "column",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "block_id", block_id: "column-list-1" },
        column: {},
        children: [createParagraphBlock("右カラムの内容")],
      };

      const columnListBlock: BlockWithChildren = {
        object: "block",
        id: "column-list-1",
        type: "column_list",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        column_list: {},
        children: [column1, column2],
      };

      const page = createMockPage("テストページ");
      page.children = [columnListBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n<!-- Column 1 -->\n\n左カラムの内容\n\n<!-- Column 2 -->\n\n右カラムの内容",
      );
    });

    test("同期ブロック（オリジナル）が正しく変換される", () => {
      const originalSyncedBlock: BlockWithChildren = {
        object: "block",
        id: "synced-original",
        type: "synced_block",
        has_children: true,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        synced_block: {
          synced_from: null,
        },
        children: [createParagraphBlock("同期されたコンテンツ")],
      };

      const page = createMockPage("テストページ");
      page.children = [originalSyncedBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n<!-- Synced Block (Original) -->\n\n同期されたコンテンツ",
      );
    });

    test("同期ブロック（複製）が正しく変換される", () => {
      const duplicateSyncedBlock: BlockWithChildren = {
        object: "block",
        id: "synced-duplicate",
        type: "synced_block",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        synced_block: {
          synced_from: {
            type: "block_id",
            block_id: "synced-original",
          },
        },
      };

      const page = createMockPage("テストページ");
      page.children = [duplicateSyncedBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n<!-- Synced Block (Reference to: synced-original) -->",
      );
    });

    test("数式ブロックが正しく変換される", () => {
      const equationBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "equation",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        equation: {
          expression: "e=mc^2",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [equationBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n$$e=mc^2$$");
    });

    test("パンくずリストブロックが正しく変換される", () => {
      const breadcrumbBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "breadcrumb",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        breadcrumb: {},
      };

      const page = createMockPage("テストページ");
      page.children = [breadcrumbBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n<!-- Breadcrumb -->");
    });

    test("目次ブロックが正しく変換される", () => {
      const tocBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "table_of_contents",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        table_of_contents: {
          color: "default",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [tocBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe("# テストページ\n\n<!-- Table of Contents -->");
    });

    test("テンプレートブロックが正しく変換される", () => {
      const templateBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "template",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        template: {
          rich_text: [
            {
              type: "text",
              text: { content: "新しいタスクを追加", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "新しいタスクを追加",
              href: null,
            },
          ],
        },
      };

      const page = createMockPage("テストページ");
      page.children = [templateBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\n<!-- Template: 新しいタスクを追加 -->",
      );
    });

    test("メンション（Rich text内）が正しく変換される", () => {
      const mentionBlock: BlockWithChildren = {
        object: "block",
        id: "block-1",
        type: "paragraph",
        has_children: false,
        archived: false,
        in_trash: false,
        created_time: "2023-01-01T00:00:00.000Z",
        last_edited_time: "2023-01-01T00:00:00.000Z",
        created_by: { object: "user", id: "user-1" },
        last_edited_by: { object: "user", id: "user-1" },
        parent: { type: "page_id", page_id: "page-1" },
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "タスクの担当者は ", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "タスクの担当者は ",
              href: null,
            },
            {
              type: "mention",
              mention: {
                type: "user",
                user: {
                  object: "user",
                  id: "user-123",
                  name: "田中太郎",
                  avatar_url: null,
                  type: "person",
                  person: {
                    email: "tanaka@example.com",
                  },
                },
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "田中太郎",
              href: null,
            },
            {
              type: "text",
              text: { content: " です。", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: " です。",
              href: null,
            },
          ],
          color: "default",
        },
      };

      const page = createMockPage("テストページ");
      page.children = [mentionBlock];

      const result = convertPageToMarkdown(page);

      expect(result).toBe(
        "# テストページ\n\nタスクの担当者は @田中太郎 です。",
      );
    });
  });
});
