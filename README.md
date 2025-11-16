# fetch-notion-page

![NPM Version](https://img.shields.io/npm/v/fetch-notion-page)

Fetch Notion page contents as JSON or Markdown.

## Features

- 🔄 **Recursive block fetching**: Recursively fetch all blocks in a page, unlike the raw Notion API
- 📝 **Markdown conversion**: Convert Notion pages to clean Markdown format
- 🖥️ **CLI & API**: Use as a command-line tool or programatically integrate into your applications

## Installation

### npm
```bash
npm install fetch-notion-page
```

## Usage

> [!TIP]
> Wanna use this as a MCP server? Check out [monoread](https://github.com/yukukotani/monoread)

### CLI Usage

```bash
# Set your Notion API key
export NOTION_API_KEY="your_api_key_here"

# Fetch a page as JSON
fetch-notion-page <page-url>

# Or fetch a page as Markdown
fetch-notion-page <page-url> --format markdown

# Specify maximum retries for rate limit errors
fetch-notion-page <page-url> --max-retries 3
```

### Programmatic Usage

```typescript
import { fetchNotionPage, convertPageToMarkdown } from 'fetch-notion-page';

// Fetch a Notion page with all its child blocks
const result = await fetchNotionPage('your-page-id', {
  apiKey: 'your-api-key',
  maxDepth: 10, // Optional: limit recursion depth
  maxRetries: 3 // Optional: maximum retries for rate limit errors (default: 3)
});

if (result.type === 'Success') {
  const pageWithChildren = result.value;

  // Convert to Markdown
  const markdown = convertPageToMarkdown(pageWithChildren);
  console.log(markdown);
} else {
  console.error('Failed to fetch page:', result.error);
}
```

## API Reference

### `fetchNotionPage(pageId, options)`

Recursively fetches a Notion page and all its child blocks.

**Parameters:**
- `pageId` (string): The Notion page ID
- `options` (object):
  - `apiKey` (string): Your Notion integration API key
  - `maxDepth` (number, optional): Maximum recursion depth (default: 10)
  - `maxRetries` (number, optional): Maximum number of retries for rate limit errors (default: 3)

**Returns:**
- `Result<PageWithChildren, FetchNotionPageError>`: A result object containing either the page data or error information

### `convertPageToMarkdown(page)`

Converts a fetched page to Markdown format.

**Parameters:**
- `page` (PageWithChildren): The page object returned by `fetchNotionPage`

**Returns:**
- `string`: The page content in Markdown format


## Notion API Setup

1. Create a new integration at [Notion Developers](https://www.notion.so/my-integrations)
2. Copy the Internal Integration Token
3. Share your pages with the integration:
   - Open the page in Notion
   - Click "Share" → "Add people, emails, or integrations"
   - Select your integration

## License

Apache License 2.0

