export type FetchNotionPageError =
  | { kind: "api_key_missing"; message: string }
  | { kind: "page_not_found"; pageId: string; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "rate_limited"; message: string }
  | { kind: "network_error"; message: string; cause?: Error }
  | { kind: "max_depth_exceeded"; depth: number; message: string }
  | { kind: "unknown"; message: string; cause?: unknown };

export type NotionApiError =
  | { kind: "api_error"; message: string; cause?: unknown }
  | { kind: "network_error"; message: string; cause?: Error }
  | { kind: "page_not_found"; pageId?: string; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "rate_limited"; message: string };

export type BuildError =
  | { kind: "max_depth_exceeded"; depth: number; message: string }
  | { kind: "api_error"; message: string; cause?: unknown }
  | { kind: "fetch_failed"; blockId: string; message: string; cause?: unknown };
