import { z } from "zod";

export const pageContextTool = {
  description:
    "Page context as markdown: URL, title, and text content (headings, links, lists). Fast. No visuals.",
  inputSchema: z.object({
    reason: z.string().describe("Why you need page context"),
  }),
} as const;
