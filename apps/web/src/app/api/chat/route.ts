import { google } from "@ai-sdk/google";
import {
  buildSystemPrompt,
  clientTools,
  createSanityAgentContextClient,
} from "@workspace/ai-commerce";
import { env } from "@workspace/env/server";
import { convertToModelMessages, stepCountIs, streamText } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY || !env.SANITY_CONTEXT_MCP_URL) {
    return new Response(
      JSON.stringify({
        error:
          "AI assistant requires configuration. Set GOOGLE_GENERATIVE_AI_API_KEY and SANITY_CONTEXT_MCP_URL — see README.",
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const { messages, userContext } = (await req.json()) as {
    messages: unknown[];
    userContext?:
      | {
          documentTitle: string;
          documentDescription?: string;
          documentLocation: string;
        }
      | null;
  };

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
