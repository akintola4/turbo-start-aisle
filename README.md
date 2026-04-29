# Turbo Start Aisle

![Turbo Start Aisle](og.jpg)

> **Aisle** — a starter for headless Shopify with an AI shopping assistant baked in. Built on top of `turbo-start-shopify`, with a floating chat widget, page-context capture, AI-controlled filters, and inline product cards powered by Vercel AI SDK + Gemini 2.5 Flash + Sanity Agent Context MCP.

The "AI" lives inside the word — and inside the chat bubble.

## What's added on top of turbo-start-shopify

- `packages/ai-commerce/` — chat widget UI, AI tool definitions, page-context React Query hooks, system prompt, Sanity Agent Context MCP wrapper.
- `apps/web/src/app/api/chat/route.ts` — Vercel AI SDK route handler (Gemini 2.5 Flash + MCP tools + client tools).
- `apps/web/src/components/page-context-tracker.tsx` — keeps the chat aware of the current route.
- `apps/web/src/components/ai-cart-bridge.tsx` — bridges chat product cards' "Add to cart" event into the Shopify-backed cart context.
- New env entries (`GOOGLE_GENERATIVE_AI_API_KEY`, `SANITY_CONTEXT_MCP_URL`) — both optional; the chat route returns 503 until both are set.

## Manual setup steps to enable the AI assistant

1. **Sanity Connect for Shopify** — install the Sanity Connect Shopify app on your Shopify dev store and connect it to a Sanity project + dataset matching `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET`. Trigger an initial sync from Connect's UI.
2. **Sanity Agent Context MCP** — set up a Sanity Agent Context server pointed at the same dataset. Capture its HTTPS URL and add it as `SANITY_CONTEXT_MCP_URL`. The MCP uses `SANITY_API_READ_TOKEN` for Bearer auth (already used by the rest of the project).
3. **Gemini API key** — create one in Google AI Studio. Add it as `GOOGLE_GENERATIVE_AI_API_KEY`.
4. Copy `apps/web/.env.local.example` → `apps/web/.env.local` and fill in values.
5. Boot:

   ```bash
   pnpm dev
   ```

6. Open `http://localhost:3000`. Click the bottom-right chat bubble; ask "show me products under $50" or "what brands do you have?".

## Reference checkouts

`.research/turbo-start-shopify/` and `.research/context-agent-sanity-test/` are read-only reference clones of the source projects. Both are gitignored. They are useful when modifying `packages/ai-commerce/` to compare against the original implementations.

---

## Foundation

Turbo Start Aisle is built on top of [`robotostudio/turbo-start-shopify`](https://github.com/robotostudio/turbo-start-shopify) — see that repository for the underlying commerce stack documentation (page builder, blog, navigation, SEO, Shopify cart, Sanity Studio, deployment, etc.). The Aisle additions are limited to `packages/ai-commerce/` and the chat-related files in `apps/web/`.

The reference checkout at `.research/turbo-start-shopify/` is the exact upstream snapshot used during this build.
