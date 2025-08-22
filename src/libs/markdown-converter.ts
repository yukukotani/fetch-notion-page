import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { BlockWithChildren } from "../types/block-with-children.js";
import type { PageWithChildren } from "../types/page-with-children.js";

export function convertPageToMarkdown(page: PageWithChildren): string {
  const markdownParts: string[] = [];

  const title = extractPageTitle(page);
  if (title) {
    markdownParts.push(`# ${title}\n`);
  }

  if (page.children && page.children.length > 0) {
    const blocksMarkdown = convertBlocksToMarkdown(page.children);
    if (blocksMarkdown.trim()) {
      markdownParts.push(blocksMarkdown);
    }
  }

  return markdownParts.join("\n");
}

function extractPageTitle(page: PageWithChildren): string | null {
  if (page.properties) {
    for (const propertyValue of Object.values(page.properties)) {
      if (propertyValue.type === "title" && propertyValue.title) {
        return propertyValue.title
          .map((richText) => richText.plain_text)
          .join("");
      }
    }
  }
  return null;
}

function convertBlocksToMarkdown(blocks: BlockWithChildren[]): string {
  return blocks
    .map((block, index) => convertBlockToMarkdown(block, 0, index))
    .filter((markdown) => markdown.trim() !== "")
    .join("\n\n");
}

function convertBlockToMarkdown(
  block: BlockWithChildren,
  depth: number,
  index: number,
): string {
  const indent = "  ".repeat(depth);
  let markdown = "";

  switch (block.type) {
    case "paragraph": {
      const text = extractRichTextContent(block.paragraph?.rich_text || []);
      markdown = `${indent}${text}`;
      break;
    }

    case "heading_1": {
      const text = extractRichTextContent(block.heading_1?.rich_text || []);
      markdown = `# ${text}`;
      break;
    }

    case "heading_2": {
      const text = extractRichTextContent(block.heading_2?.rich_text || []);
      markdown = `## ${text}`;
      break;
    }

    case "heading_3": {
      const text = extractRichTextContent(block.heading_3?.rich_text || []);
      markdown = `### ${text}`;
      break;
    }

    case "bulleted_list_item": {
      const text = extractRichTextContent(
        block.bulleted_list_item?.rich_text || [],
      );
      markdown = `${indent}- ${text}`;
      break;
    }

    case "numbered_list_item": {
      const text = extractRichTextContent(
        block.numbered_list_item?.rich_text || [],
      );
      markdown = `${indent}${index + 1}. ${text}`;
      break;
    }

    case "quote": {
      const text = extractRichTextContent(block.quote?.rich_text || []);
      markdown = `> ${text}`;
      break;
    }

    case "code": {
      const text = extractRichTextContent(block.code?.rich_text || []);
      const language = block.code?.language || "";
      markdown = `\`\`\`${language}\n${text}\n\`\`\``;
      break;
    }

    case "callout": {
      const text = extractRichTextContent(block.callout?.rich_text || []);
      const icon = block.callout?.icon
        ? "emoji" in block.callout.icon
          ? block.callout.icon.emoji
          : ""
        : "";
      markdown = `> ${icon} ${text}`;
      break;
    }

    case "divider": {
      markdown = "---";
      break;
    }

    case "to_do": {
      const text = extractRichTextContent(block.to_do?.rich_text || []);
      const checked = block.to_do?.checked ? "x" : " ";
      markdown = `${indent}- [${checked}] ${text}`;
      break;
    }

    case "toggle": {
      const text = extractRichTextContent(block.toggle?.rich_text || []);
      markdown = `<details>\n<summary>${text}</summary>\n`;
      break;
    }

    case "image": {
      if (block.image) {
        const url = getFileUrl(block.image);
        const caption = block.image.caption
          ? extractRichTextContent(block.image.caption)
          : "";
        markdown = caption ? `![${caption}](${url})` : `![](${url})`;
      }
      break;
    }

    case "audio": {
      if (block.audio) {
        const url = getFileUrl(block.audio);
        const caption = block.audio.caption
          ? extractRichTextContent(block.audio.caption)
          : "Audio";
        markdown = `[${caption}](${url})`;
      }
      break;
    }

    case "video": {
      if (block.video) {
        const url = getFileUrl(block.video);
        const captionText = block.video.caption
          ? extractRichTextContent(block.video.caption)
          : "";
        const caption = captionText || "Video";
        markdown = `[${caption}](${url})`;
      }
      break;
    }

    case "pdf": {
      if (block.pdf) {
        const url = getFileUrl(block.pdf);
        const caption = block.pdf.caption
          ? extractRichTextContent(block.pdf.caption)
          : "PDF";
        markdown = `[${caption}](${url})`;
      }
      break;
    }

    case "file": {
      if (block.file) {
        const url = getFileUrl(block.file);
        const captionText = block.file.caption
          ? extractRichTextContent(block.file.caption)
          : "";
        const caption = captionText || "File";
        markdown = `[${caption}](${url})`;
      }
      break;
    }

    case "table": {
      if (block.type === "table" && block.table && block.children) {
        markdown = convertTableToMarkdown(block);
      }
      break;
    }

    case "table_row": {
      // Table rowは単独では処理せず、親のTableブロックで処理される
      break;
    }

    case "bookmark": {
      if (block.bookmark?.url) {
        const caption = block.bookmark.caption
          ? extractRichTextContent(block.bookmark.caption)
          : "Bookmark";
        markdown = `[🔖 ${caption}](${block.bookmark.url})`;
      }
      break;
    }

    case "embed": {
      if (block.embed?.url) {
        markdown = `[🔗 Embed](${block.embed.url})`;
      }
      break;
    }

    case "link_preview": {
      markdown = `[${block.link_preview.url}](${block.link_preview.url})`;
      break;
    }

    case "child_page": {
      markdown = `<page id="${block.id}" title="${block.child_page.title}" />`;
      break;
    }

    case "child_database": {
      markdown = `<database id="${block.id}" title="${block.child_database.title}" />`;
      break;
    }

    case "column_list": {
      if (block.children) {
        markdown = convertColumnListToMarkdown(block);
      }
      break;
    }

    case "column": {
      // Columnは単独では処理せず、親のColumn listブロックで処理される
      break;
    }

    case "synced_block": {
      if (block.synced_block) {
        if (block.synced_block.synced_from === null) {
          // Original synced block
          const markdownParts = ["<!-- Synced Block (Original) -->"];

          if (block.children && block.children.length > 0) {
            const childrenMarkdown = block.children
              .map((child, childIndex) =>
                convertBlockToMarkdown(child, depth, childIndex),
              )
              .filter((childMarkdown) => childMarkdown.trim() !== "")
              .join("\n\n");

            if (childrenMarkdown.trim()) {
              markdownParts.push(childrenMarkdown);
            }
          }

          markdown = markdownParts.join("\n\n");
        } else if (block.synced_block.synced_from?.block_id) {
          // Duplicate synced block
          markdown = `<!-- Synced Block (Reference to: ${block.synced_block.synced_from.block_id}) -->`;
        }
      }
      break;
    }

    case "equation": {
      if (block.equation?.expression) {
        markdown = `$$${block.equation.expression}$$`;
      }
      break;
    }

    case "breadcrumb": {
      markdown = "<!-- Breadcrumb -->";
      break;
    }

    case "table_of_contents": {
      markdown = "<!-- Table of Contents -->";
      break;
    }

    case "template": {
      if (block.template) {
        const title = extractRichTextContent(block.template.rich_text || []);
        markdown = `<!-- Template: ${title} -->`;
      }
      break;
    }

    default: {
      // 他のブロックタイプは基本的なテキストのみ表示
      break;
    }
  }

  if (
    block.children &&
    block.children.length > 0 &&
    block.type !== "table" &&
    block.type !== "column_list" &&
    block.type !== "synced_block"
  ) {
    // リストアイテム系のブロックの場合は改行を調整
    const isListItem =
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item" ||
      block.type === "to_do";

    const separator = isListItem ? "\n" : "\n\n";
    const childrenMarkdown = block.children
      .map((child, childIndex) =>
        convertBlockToMarkdown(child, depth + 1, childIndex),
      )
      .filter((childMarkdown) => childMarkdown.trim() !== "")
      .join(separator);

    if (childrenMarkdown.trim()) {
      if (block.type === "toggle") {
        markdown += `\n${childrenMarkdown}\n</details>`;
      } else {
        const connector = isListItem ? "\n" : "\n\n";
        markdown = markdown
          ? `${markdown}${connector}${childrenMarkdown}`
          : childrenMarkdown;
      }
    }
  }

  return markdown;
}

function convertColumnListToMarkdown(
  columnListBlock: BlockWithChildren,
): string {
  if (!columnListBlock.children) {
    return "";
  }

  const columns = columnListBlock.children.filter(
    (child) => child.type === "column",
  );
  if (columns.length === 0) {
    return "";
  }

  const columnMarkdowns: string[] = [];

  columns.forEach((column, index) => {
    const columnContent: string[] = [];

    // カラムのヘッダーコメント
    columnContent.push(`<!-- Column ${index + 1} -->`);

    if (column.children && column.children.length > 0) {
      const childrenMarkdown = column.children
        .map((child, childIndex) =>
          convertBlockToMarkdown(child, 0, childIndex),
        )
        .filter((markdown) => markdown.trim() !== "")
        .join("\n\n");

      if (childrenMarkdown.trim()) {
        columnContent.push(childrenMarkdown);
      }
    }

    if (columnContent.length > 1) {
      columnMarkdowns.push(columnContent.join("\n\n"));
    }
  });

  return columnMarkdowns.join("\n\n");
}

function convertTableToMarkdown(tableBlock: BlockWithChildren): string {
  if (
    tableBlock.type !== "table" ||
    !tableBlock.table ||
    !tableBlock.children
  ) {
    return "";
  }

  const tableRows = tableBlock.children.filter(
    (child) => child.type === "table_row",
  );
  if (tableRows.length === 0) {
    return "";
  }

  const markdownRows: string[] = [];
  const hasColumnHeader = tableBlock.table.has_column_header || false;

  tableRows.forEach((row, rowIndex) => {
    if (row.type === "table_row" && row.table_row?.cells) {
      const cells = row.table_row.cells.map((cell) => {
        const cellContent = extractRichTextContent(cell);
        // テーブル内の | をエスケープ
        return cellContent.replace(/\|/g, "\\|");
      });

      const markdownRow = `| ${cells.join(" | ")} |`;
      markdownRows.push(markdownRow);

      // 最初の行の後にヘッダー区切り線を追加（列ヘッダーがある場合）
      if (rowIndex === 0 && hasColumnHeader) {
        const separatorCells = cells.map(() => "---");
        const separatorRow = `| ${separatorCells.join(" | ")} |`;
        markdownRows.push(separatorRow);
      }
    }
  });

  return markdownRows.join("\n");
}

function getFileUrl(fileObject: {
  type: string;
  external?: { url: string };
  file?: { url: string };
}): string {
  if (fileObject.type === "external" && fileObject.external?.url) {
    return fileObject.external.url;
  }
  if (fileObject.type === "file" && fileObject.file?.url) {
    return fileObject.file.url;
  }
  return "";
}

function extractRichTextContent(richTextArray: RichTextItemResponse[]): string {
  return richTextArray
    .map((richText) => {
      let text = richText.plain_text || "";

      // Mentionの処理
      if (richText.type === "mention" && richText.mention) {
        switch (richText.mention.type) {
          case "user":
            text = `${text}`;
            break;
          case "date":
            text = `@${text}`;
            break;
          case "page":
            text = `@${text}`;
            break;
          case "database":
            text = `@${text}`;
            break;
          case "link_preview":
            text = `@${text}`;
            break;
          case "link_mention":
            text = `${richText.mention.link_mention.title || text}`;
            break;
          default:
            text = `@${text}`;
        }
      }

      // リンクの処理（アノテーションの前に処理）
      if (richText.href) {
        text = `[${text}](${richText.href})`;
      }

      if (richText.annotations) {
        let formattedText = text;

        if (richText.annotations.bold) {
          formattedText = `**${formattedText}**`;
        }
        if (richText.annotations.italic) {
          formattedText = `*${formattedText}*`;
        }
        if (richText.annotations.strikethrough) {
          formattedText = `~~${formattedText}~~`;
        }
        if (richText.annotations.underline) {
          formattedText = `<u>${formattedText}</u>`;
        }
        if (richText.annotations.code) {
          formattedText = `\`${formattedText}\``;
        }
        if (
          richText.annotations.color &&
          richText.annotations.color !== "default"
        ) {
          formattedText = `<span style="color: ${richText.annotations.color.replace("_background", "")}">${formattedText}</span>`;
        }

        return formattedText;
      }

      return text;
    })
    .join("");
}
