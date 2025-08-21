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

    default: {
      // 他のブロックタイプは基本的なテキストのみ表示
      break;
    }
  }

  if (block.children && block.children.length > 0) {
    const childrenMarkdown = block.children
      .map((child, childIndex) =>
        convertBlockToMarkdown(child, depth + 1, childIndex),
      )
      .filter((childMarkdown) => childMarkdown.trim() !== "")
      .join("\n\n");

    if (childrenMarkdown.trim()) {
      if (block.type === "toggle") {
        markdown += `\n${childrenMarkdown}\n</details>`;
      } else {
        markdown = markdown
          ? `${markdown}\n\n${childrenMarkdown}`
          : childrenMarkdown;
      }
    }
  }

  return markdown;
}

function extractRichTextContent(richTextArray: RichTextItemResponse[]): string {
  return richTextArray
    .map((richText) => {
      const text = richText.plain_text || "";

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
        if (richText.annotations.code) {
          formattedText = `\`${formattedText}\``;
        }

        return formattedText;
      }

      return text;
    })
    .join("");
}
