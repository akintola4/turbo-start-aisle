import { z } from "zod";

export const screenshotTool = {
  description:
    "Visual screenshot of the page. You CANNOT see anything visual without this — no images, colors, layout, or appearance.",
  inputSchema: z.object({
    reason: z.string().describe("Why you need a screenshot"),
  }),
} as const;
