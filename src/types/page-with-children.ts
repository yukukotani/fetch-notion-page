import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints.js";
import type { BlockWithChildren } from "./block-with-children.js";

export type PageWithChildren = PageObjectResponse & {
  children?: BlockWithChildren[];
};
