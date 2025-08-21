#!/usr/bin/env node

import { extractCliArgs, handleCli } from "./presentation/cli.js";

const main = (): void => {
  const args = extractCliArgs(process.argv);
  handleCli(args);
};

main();
