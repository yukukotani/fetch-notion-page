export function isNotionUrl(input: string): boolean {
  if (!input || typeof input !== "string") {
    return false;
  }

  try {
    const url = new URL(input);
    return url.hostname === "www.notion.so" || url.hostname === "notion.so";
  } catch {
    return false;
  }
}

export function extractPageIdFromUrl(input: string): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  // ページIDのみが渡された場合（32文字または36文字のハイフン付き）
  if (isPageId(input)) {
    return input;
  }

  // URLとして解析を試行
  if (!isNotionUrl(input)) {
    return null;
  }

  try {
    const url = new URL(input);
    const pathname = url.pathname;

    // パスから最後のセグメントを取得
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) {
      return null;
    }

    // 新形式の場合: "Page-Title-{pageId}" or "{pageId}"
    const pageId = extractPageIdFromSegment(lastSegment);
    if (pageId) {
      return pageId;
    }

    return null;
  } catch {
    return null;
  }
}

function isPageId(input: string): boolean {
  // ハイフン付きUUID形式 (36文字)
  const uuidPattern =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

  // ハイフンなし32文字
  const noHyphenPattern = /^[0-9a-fA-F]{32}$/;

  return uuidPattern.test(input) || noHyphenPattern.test(input);
}

function extractPageIdFromSegment(segment: string): string | null {
  // セグメントがページIDのみの場合
  if (isPageId(segment)) {
    return segment;
  }

  // "Page-Title-{pageId}" 形式の場合
  // 最後の32文字または最後のハイフン付き36文字をチェック

  // ハイフン付きUUIDパターンで終わる場合
  const uuidMatch = segment.match(
    /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  );
  if (uuidMatch?.[1]) {
    return uuidMatch[1];
  }

  // ハイフンなし32文字で終わる場合
  const noHyphenMatch = segment.match(/([0-9a-fA-F]{32})$/);
  if (noHyphenMatch?.[1]) {
    return noHyphenMatch[1];
  }

  return null;
}
