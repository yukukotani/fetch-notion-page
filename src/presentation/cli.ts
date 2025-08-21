export function parseArgs(argv: string[]): string[] {
  return argv.slice(2);
}

export function handleCli(args: string[]): void {
  console.log("CLI not implemented yet", args);
}
