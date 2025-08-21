import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";

export type BlockWithChildren = BlockObjectResponse & {
  children?: BlockWithChildren[];
};