import { google } from "@ai-sdk/google";
import {
  buildSystemPrompt,
  clientTools,
  createSanityAgentContextClient,
} from "@workspace/ai-commerce";
import { env } from "@workspace/env/server";
import { convertToModelMessages, stepCountIs, streamText } from "ai";
import { z } from "zod";

export const runtime = "nodejs";

/**
 * SECURITY NOTE: this endpoint is unauthenticated and consumes paid Gemini + MCP
 * resources. Before deploying publicly, add auth (Clerk/Auth.js/etc.) and
 * rate-limiting (e.g. Upstash Ratelimit, Vercel Web Application Firewall) — both
 * are out of scope for this demo.
 */

const MAX_REQUEST_BYTES = 256 * 1024; // 256 KB cap on the request body

const userContextSchema = z
  .object({
    documentTitle: z.string().max(500),
    documentDescription: z.string().max(2000).optional(),
    documentLocation: z.string().max(2000),
  })
  .nullable()
  .optional();

const requestSchema = z.object({
  messages: z.array(z.unknown()).max(200),
  userContext: userContextSchema,
});

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request) {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY || !env.SANITY_CONTEXT_MCP_URL) {
    return jsonError(
      503,
      "AI assistant requires configuration. Set GOOGLE_GENERATIVE_AI_API_KEY and SANITY_CONTEXT_MCP_URL — see README.",
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonError(413, "Request body too large.");
  }

  const raw = await req.text();
  if (raw.length > MAX_REQUEST_BYTES) {
    return jsonError(413, "Request body too large.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const result = requestSchema.safeParse(parsed);
  if (!result.success) {
    return jsonError(400, "Invalid request shape.");
  }
  const { messages, userContext } = result.data;

  const mcpClient = await createSanityAgentContextClient({
    url: env.SANITY_CONTEXT_MCP_URL,
    token: env.SANITY_API_READ_TOKEN,
  });

  try {
    const mcpTools = await mcpClient.tools();
    const result = streamText({
      // biome-ignore lint/style/useNamingConvention: AI SDK option name
      model: google("gemini-2.5-flash"),
      system: buildSystemPrompt({ userContext: userContext ?? null }),
      messages: await convertToModelMessages(messages as never),
      tools: { ...mcpTools, ...clientTools },
      stopWhen: stepCountIs(20),
      onFinish: async () => {
        await mcpClient.close();
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    await mcpClient.close();
    throw error;
  }
}
