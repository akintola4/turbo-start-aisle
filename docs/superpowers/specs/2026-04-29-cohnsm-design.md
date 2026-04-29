# cohnsm — Design Spec

**Date:** 2026-04-29
**Status:** approved during brainstorming, awaiting user spec review before plan

## Goal

Combine two existing repos into a single demo:

- **`robotostudio/turbo-start-shopify`** — production headless commerce monorepo (Next.js 16 App Router, Sanity Studio v5, Shopify Storefront API, Turborepo, Shadcn + Tailwind v4).
- **`toperobotostudio/context-agent-sanity-test`** (the `ecommerce/` storefront only — not the `chatbot/` at root) — floating AI shopping assistant powered by Vercel AI SDK + Gemini 2.5 Flash + Sanity Agent Context MCP, with inline product cards, page-context capture, and AI-controlled filters.

The result is `cohnsm/`: a working, deployable monorepo that combines the production commerce architecture with the AI assistant. Demo only — no client constraints — and Shopify + Sanity credentials are scaffolded for plug-and-play later.

Both source repos are present locally as reference checkouts at:

- `/Users/foster/Documents/Saas/cohnsm/turbo-start-shopify/`
- `/Users/foster/Documents/Saas/cohnsm/context-agent-sanity-test/`

These are not part of the project — they exist to read from while building. They will be moved into `.research/` (gitignored) before the project is committed.

## Non-goals (explicit out-of-scope for v1)

- User accounts / auth (Shopify checkout handles purchase identity).
- Persistent chat history across sessions (chat resets on widget close).
- Multi-language / localization (use defaults).
- Multi-provider AI gateway (Gemini 2.5 Flash only, hardcoded).
- AI controlling navigation outside collection filters (no AI-driven routing to PDPs / cart / checkout).
- The Vercel chatbot template at port 3000 from the experiment (`context-agent-sanity-test/chatbot/` — entirely dropped).
- Tests beyond type-check (`pnpm check-types`) — turbo-start-shopify has no test framework configured; we don't introduce one for a demo.

## Sources of truth

| Concern | Owner |
|---|---|
| Product catalog (titles, prices, images, inventory, variants) | Shopify (synced into Sanity via **Sanity Connect for Shopify** — an external Shopify app installed per-store) |
| Editorial product content (body copy, color theme, hotspots) | Sanity (`product` document's non-`store` fields) |
| Pages, blog, navigation, footer, SEO, page-builder | Sanity |
| Cart, checkout, customer | Shopify (Storefront API) |
| AI inference | Google Gemini 2.5 Flash via Vercel AI SDK |
| AI tool surface for product retrieval | Sanity Agent Context MCP (HTTP transport, Bearer auth) |

The AI queries **Sanity** for products. Products land in Sanity via Sanity Connect, so the AI sees the same catalog Shopify owns — including read-only Shopify fields (`store.title`, `store.priceRange`, `store.variants`, etc.) plus any editorial fields the team has added. This matches both the experiment's pattern and turbo-start-shopify's existing data shape.

## Architecture

### Starting point

Clone `turbo-start-shopify` into the empty `cohnsm/` directory. That is the foundation. We then layer in the AI assistant as a new workspace package + a few files inside `apps/web/`.

### Monorepo layout

```
apps/
  web/                                 # kept from turbo-start-shopify
    src/app/api/chat/route.ts          # NEW — AI SDK request handler
    src/app/layout.tsx                 # MODIFIED — mount <ChatWidget /> inside <Providers>
    src/components/page-context-tracker.tsx  # NEW — small client comp that calls useSetPageContext on route change
  studio/                              # kept entirely unchanged

packages/
  ai-commerce/                         # NEW — chat widget UI, tool definitions, types, hooks
  env/                                 # kept; add new env entries (see Env section)
  sanity/                              # kept entirely unchanged
  ui/                                  # kept entirely unchanged
  logger/                              # kept entirely unchanged
  typescript-config/                   # kept entirely unchanged
```

### `packages/ai-commerce/` internals

```
packages/ai-commerce/
├── src/
│   ├── ui/
│   │   ├── chat-widget.tsx          # Floating bubble + open/close, mounted once
│   │   ├── chat-panel.tsx           # The conversation surface, hosts <useChat>
│   │   ├── message-list.tsx         # Renders user + assistant turns
│   │   ├── message-input.tsx        # Composer
│   │   ├── product.tsx              # Inline product card; fetches by Sanity _id
│   │   └── text-part.tsx            # ReactMarkdown + remarkAgentDirectives renderer
│   │
│   ├── tools/
│   │   ├── index.ts                 # Tool registry (input schemas only — execution is split)
│   │   ├── set-collection-filters.ts
│   │   ├── page-context.ts          # Markdown capture (Turndown) — declared server-side, executed client-side
│   │   └── screenshot.ts            # Visual capture — declared server-side, executed client-side
│   │
│   ├── context/
│   │   ├── page-context.ts          # React Query–backed setter + reader hooks
│   │   └── chat-context.tsx         # Chat open/closed state
│   │
│   ├── mcp/
│   │   └── sanity-agent-context.ts  # Wires @ai-sdk/mcp createMCPClient
│   │
│   ├── types.ts                     # PageContext, ProductFilters Zod schema, ToolName enum, etc.
│   ├── system-prompt.ts             # buildSystemPrompt(userContext)
│   └── index.ts                     # Public exports
│
├── package.json
└── tsconfig.json
```

**This package owns:** chat UI, tool *definitions* (Zod schemas + descriptions), the page-context React Query hooks, the system-prompt builder, and the Sanity Agent Context MCP client wrapper.

**This package does NOT own:** the Next.js API route handler (lives in `apps/web/api/chat/route.ts` — needs request-time access), Sanity client construction (consumes `@workspace/sanity`), Shopify cart calls (consumes the existing cart context in `apps/web/`).

**Dependencies** (versions to pin from the experiment's `ecommerce/package.json`): `ai@^6`, `@ai-sdk/google@^3`, `@ai-sdk/react@^3`, `@ai-sdk/mcp@^1`, `@sanity/agent-directives@^0.0.10`, `react-markdown@^10`, `turndown@^7` + `@types/turndown`, `html2canvas-pro@^1.6` (note: the `-pro` fork — more compatible with modern CSS than legacy `html2canvas`). Workspace deps: `@workspace/ui`, `@workspace/sanity`. Peer-deps `@tanstack/react-query` and `react`/`react-dom` (already provided by the consuming `apps/web`).

## AI tool surface

Three client-side tools (declared in the API route's `tools` map but executed in the browser via `useChat.onToolCall`), plus tools fetched dynamically from Sanity Agent Context MCP (`mcpClient.tools()` — provides GROQ query and other Sanity-side tools).

### Tool 1: `set_collection_filters`

**Purpose:** AI updates the active collection page's filters.

**Input schema** mirrors turbo-start-shopify's collection `searchParams` exactly (read from `apps/web/src/components/collection/filter-utils.ts` and `sort-utils.ts`):

```ts
const productFiltersSchema = z.object({
  collection: z.string().describe("Collection handle to navigate to"),
  available: z.boolean().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  vendor: z.array(z.string()).optional(),
  type: z.array(z.string()).optional(),
  tag: z.array(z.string()).optional(),
  sort: z.string().optional(),       // matches Shopify ProductCollectionSortKeys
  reverse: z.boolean().optional(),
});
```

**Execution (client-side):** the chat panel's `onToolCall` handler builds a URLSearchParams using the `filter.*` key naming (`filter.available`, `filter.price.min`, `filter.price.max`, `filter.vendor`, `filter.type`, `filter.tag`, plus `sort` and `reverse`) and calls `router.push(\`/collections/\${collection}?\${params}\`, { scroll: false })`. Returns a structured `addToolOutput()` describing the applied filters so the AI can confirm.

### Tool 2: `page_context`

**Purpose:** AI fetches a markdown summary of what's currently on screen.

**Input schema:** `{ reason: string }`.

**Execution (client-side):** uses `turndown` to convert the current `<main>` element into markdown, strips `[data-agent-chat-hidden]` elements, returns `{ url, title, content (≤4000 chars) }`. Identical to the experiment.

### Tool 3: `screenshot`

**Purpose:** visual capture of the page (for "what does this look like?" type questions).

**Input schema:** `{ reason: string }`.

**Execution (client-side):** uses `html2canvas-pro` to render `document.body`, ignoring elements with `[data-agent-chat-hidden]`. Resizes to a max 4000px dimension and returns a JPEG data URL at 0.7 quality. Because `addToolOutput` doesn't carry files, the screenshot is queued in a ref and sent as a follow-up `sendMessage` with a `file` part once the tool result lands. Identical to the experiment's `captureScreenshot()` and the queueing pattern in `Chat.tsx`.

### MCP-provided tools

Sanity Agent Context MCP exposes server-side tools (GROQ query, etc.) that the AI uses to retrieve products. We do not redefine these — `mcpClient.tools()` returns them at request time.

### Implicit (not a tool): `userContext` injection

Every request to `/api/chat` includes a `userContext` field in the body, populated client-side from `document.title`, `document.querySelector('meta[name="description"]')`, and `window.location.pathname`. The route handler converts this to a structured system prompt section. Same approach as the experiment.

## Page-context mechanism

Two layers, matching the experiment:

1. **Lightweight implicit context** — sent on every request via `DefaultChatTransport({ body: () => ({ userContext: captureUserContext() }) })`. Fast, always present.
2. **On-demand deep context** — the `page_context` tool (markdown via Turndown). Used when AI needs to reason about content beyond title/path.

A small `<PageContextTracker />` client component sits in the root layout and uses `usePathname()` to update a route-level slice of the page-context React Query entry on navigation. PDP and collection pages additionally call `useSetPageContext({ surface: 'pdp', product: {...} })` / `useSetPageContext({ surface: 'collection', collection: {...} })` to enrich.

The page-context React Query entry shape:

```ts
type PageContext = {
  route: string;
  surface: 'home' | 'pdp' | 'collection' | 'search' | 'cart' | 'content' | 'other';
  product?: { id: string; slug: string; title: string };
  collection?: { handle: string; activeFilters: Record<string, unknown> };
};
```

Stored at React Query key `['ai-commerce', 'page-context']` with `staleTime: Infinity` and `queryFn: () => null` — written via `setQueryData`, never fetched. React Query is reused (already wired in `apps/web/src/components/providers.tsx` from turbo-start-shopify); no new state library is introduced.

## Inline product cards

The AI returns text containing markdown directives:

```
Here are two options that match what you described:

::document{id="<sanity-product-id>" type="product"}
::document{id="<sanity-product-id>" type="product"}
```

Rendering pipeline (in `text-part.tsx`):

1. `ReactMarkdown` with the `remarkAgentDirectives` plugin from `@sanity/agent-directives/react` parses the directives.
2. The custom `Document` component routes `type="product"` to a `<Product id={...} />` component in the package.
3. `<Product>` fetches by `_id` from Sanity using a GROQ projection that dereferences variants and extracts the fields needed for a card. The product document's data is nested under `store` (Sanity Connect's `shopifyProduct` shape), and variants are weak references to `productVariant` documents whose data is also under `store`:

   ```groq
   *[_id == $id][0]{
     _id,
     "title": store.title,
     "slug": store.slug.current,
     "imageUrl": store.previewImageUrl,
     "minPrice": store.priceRange.minVariantPrice,
     "maxPrice": store.priceRange.maxVariantPrice,
     "isActive": store.status == "active" && !store.isDeleted,
     "variants": store.variants[]->{
       _id,
       "gid": store.gid,
       "title": store.title,
       "available": store.inventory.isAvailable,
       "price": store.price
     }
   }
   ```

   `store.priceRange.minVariantPrice` and `store.priceRange.maxVariantPrice` are plain numbers (per `apps/studio/schemaTypes/objects/shopify/price-range.ts`); currency comes from the storefront's locale (out of scope to localize per-card in v1).

4. **Add-to-cart from card**: the card is single-variant (and thus eligible for inline add-to-cart) when `variants.length === 1 && variants[0].available === true`. In that case it renders an "Add to cart" button that calls `useCart().addLine(variants[0].gid, 1)` — note the variant ID is the **Shopify GID** (`store.variants[].gid`, dereferenced), not the Sanity `_id`. Otherwise (multi-variant or out of stock), the card hides the button and renders a "View options" link to `/products/{slug}`. This avoids guessing a variant for size/color products and keeps the v1 surface honest.

This works because products are in Sanity (via Sanity Connect) with the `store` field mirroring Shopify, and variants are weak references to `productVariant` documents that carry the Shopify variant `gid`.

## Cart integration

No new cart code. The chat plugs into the existing turbo-start-shopify cart:

- `apps/web/src/app/cart/actions.ts` — server actions: `createCart`, `addToCart`, `updateCartLine`, `removeCartLine`, `getCart`, `checkVariantInventory`.
- `apps/web/src/components/cart/cart-context.tsx` — provides `addLine(variantId, quantity)`, `openCart()`, etc.

The product card's "Add to cart" button calls `useCart().addLine()`. No AI tool is exposed for cart mutation in v1 — the AI suggests products via `::document{...}` directives, the user clicks Add to cart on the rendered card.

## API route — `apps/web/src/app/api/chat/route.ts`

```ts
export async function POST(req: Request) {
  const { messages, userContext } = await req.json();

  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: env.SANITY_CONTEXT_MCP_URL,
      headers: { Authorization: `Bearer ${env.SANITY_API_READ_TOKEN}` },
    },
  });

  try {
    const mcpTools = await mcpClient.tools();
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: buildSystemPrompt({ userContext }),
      messages: await convertToModelMessages(messages),
      tools: { ...mcpTools, ...clientTools },
      stopWhen: stepCountIs(20),
      onFinish: async () => { await mcpClient.close(); },
    });
    return result.toUIMessageStreamResponse();
  } catch (e) {
    await mcpClient.close();
    throw e;
  }
}
```

This is a near-verbatim copy of the experiment's route handler, with env access through `@workspace/env/server` (T3 Zod-validated) instead of raw `process.env`. The `clientTools` map is imported from `@workspace/ai-commerce`.

## System prompt

The system prompt (in `packages/ai-commerce/src/system-prompt.ts`) instructs the model to:

- Use the GROQ tool from MCP to query products before suggesting them.
- Validate filter values against existing Sanity data before calling `set_collection_filters`.
- Reference products inline via `::document{id="..." type="product"}` directives, never as plain text titles.
- Keep replies short and conversational; let the product cards do the talking.
- Use the `page_context` tool only when the implicit `userContext` is insufficient.

The structure is taken from the experiment, but the **schema-knowledge section is rewritten** for turbo-start-shopify's product shape. The experiment's prompt teaches a flat schema (`title`, `price`, `category`, `brand`, `inStock`); turbo-start-shopify products are nested under `store` (Sanity Connect's mirror of Shopify). The new prompt teaches:

- `store.title` (not `title`), `store.priceRange.minVariantPrice` and `store.priceRange.maxVariantPrice` (both plain numbers, not `price`), `store.vendor` (brand), `store.productType` (category), `store.tags` (comma-separated Shopify tag string), `store.status == "active" && !store.isDeleted` (availability gate), `store.previewImageUrl`.
- Variants are weak references to `productVariant` documents — dereference with `store.variants[]->`. Within a variant, fields are again under `store`: `store.gid` (Shopify variant GID for cart calls), `store.price`, `store.compareAtPrice`, `store.inventory.isAvailable`, `store.option1/2/3`.
- Example queries the AI is shown:
  - Active products: `*[_type == "product" && store.status == "active" && !store.isDeleted]`
  - By brand (vendor): `*[_type == "product" && store.vendor == "Acme"]`
  - By category (productType): `*[_type == "product" && store.productType == "Apparel"]`
  - Under a price: `*[_type == "product" && store.priceRange.maxVariantPrice < 100]`
  - On sale (any variant discounted): `*[_type == "product" && count((store.variants[]->store)[compareAtPrice > price]) > 0]`

Filter-related guidance also changes: the experiment's filter shape (`category`, `brand`, `minPrice`, `maxPrice`, `sort` enum) is replaced with turbo-start-shopify's actual searchParams (`available`, `priceMin`, `priceMax`, `vendor[]`, `type[]`, `tag[]`, `sort` as a Shopify enum string, `reverse`).

## Configuration / environment

Adds these env entries to `packages/env/src/server.ts`:

- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini API key. **Optional** (`z.string().default("")`) so the project boots without real AI credentials.
- `SANITY_CONTEXT_MCP_URL` — Sanity Agent Context MCP HTTP endpoint. **Optional** with same `default("")` semantics.

No new client-side env entries. The existing `SANITY_API_READ_TOKEN` (already a `z.string().min(1)` requirement) is reused for MCP Bearer auth.

**Plug-and-play scope:** the AI-specific envs above are optional, so a fresh clone boots with the chat widget mounted but disabled — `/api/chat` returns a 503 with a friendly message ("AI assistant requires configuration — see README") if either AI env is empty. The chat widget hides itself when the API returns 503.

**Pre-existing turbo-start-shopify envs are NOT loosened.** Required-at-boot envs (`SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN`, `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_ACCESS_TOKEN`, `NEXT_PUBLIC_SANITY_*`) keep their `z.string().min(1)` constraints. The user must still provide Shopify + Sanity credentials to run the project at all — that's a turbo-start-shopify precondition, unchanged by this design. "Plug-and-play" applies to the AI layer only.

**Sanity Connect setup** (manual, documented in README):

1. Create a Shopify Partner dev store.
2. Install the Sanity Connect for Shopify Shopify app on the dev store.
3. Connect to a fresh Sanity project + dataset matching `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET`.
4. Trigger an initial sync from Connect's UI.
5. Configure the Sanity Agent Context MCP server (URL + token) and update env.

This is documented but not executed — design assumes someone runs through this once.

## Deployment surface

Out of scope to actually deploy. Designed for Vercel (Next.js 16 + Sanity Studio) but no deploy config beyond what turbo-start-shopify already ships with.

## What we discard from each source repo

**From `context-agent-sanity-test`:**

- The entire `chatbot/` app (port 3000) — Vercel chatbot template, Auth.js, Postgres chat history, file storage. Not in scope.
- The brutalist/pixel CSS and pixel-font headings — replaced by Shadcn defaults.
- The hand-rolled `localStorage`-backed cart in `ecommerce/src/lib/cart-context.tsx` — replaced by turbo-start-shopify's Shopify-backed cart.
- The hand-rolled product schema in the experiment's Sanity dataset — replaced by turbo-start-shopify's Sanity Connect–driven `product` document.
- Filter schema (`category`, `brand`, `minPrice`, `maxPrice`) — replaced by turbo-start-shopify's `filter.*` shape.

**From `turbo-start-shopify`:**

- Nothing structurally. Adds `packages/ai-commerce/` and a few files inside `apps/web/`. The `apps/studio/`, all other `packages/`, and the rest of `apps/web/` are kept as-is.

## Migration / adoption order

This is a fresh build, not an in-place migration. Implementation proceeds:

1. Clone `turbo-start-shopify` into `cohnsm/`.
2. Move the two reference clones into `cohnsm/.research/` (gitignored).
3. Scaffold `packages/ai-commerce/` (empty package, peer deps declared).
4. Port chat UI components from `context-agent-sanity-test/ecommerce/src/components/chat/` into `packages/ai-commerce/src/ui/` — restyled to Shadcn primitives, no brutalist CSS.
5. Port tool definitions and the system prompt, adjusted for turbo-start-shopify's filter schema.
6. Port the page-context provider, adapted to use React Query.
7. Wire the API route in `apps/web/src/app/api/chat/route.ts`.
8. Mount `<ChatWidget />` in `apps/web/src/app/layout.tsx` inside the existing `<Providers>`.
9. Add env entries to `@workspace/env/server` and document the Sanity Connect setup steps in the README.
10. Verify type-check passes (`pnpm check-types`); the project should boot end-to-end with empty AI envs (chat returns 503 message) and full functionality with real envs.

## Risks and open questions

- **Sanity Connect installation friction.** This is an external Shopify app dependency. If Sanity Connect changes its schema or the user picks a different sync mechanism, the AI tool layer still works (it queries Sanity, which is the abstraction boundary), but the schema in `apps/studio/schemaTypes/documents/product.tsx` would need to match whatever fields land in Sanity. Acceptable for a demo.
- **Inline product card variant selection.** Cards default to `store.variants[0]` for "Add to cart". For products with size/color, this can be wrong. v1 falls back to "click to view PDP" for any product where the default variant isn't `availableForSale`. Multi-variant inline selection is a v2 feature.
- **MCP transport stability.** The Sanity Agent Context MCP is configured per-Sanity-project; for the demo we assume a single MCP endpoint. Future multi-tenant scenarios are out of scope.
- **Tool execution security.** Client-side tools (`set_collection_filters`, `page_context`, `screenshot`) only manipulate the local browser — no auth-bearing operations. The server-side MCP tools are read-only via `SANITY_API_READ_TOKEN`. No write paths are exposed to the AI in v1.

## Approval status

- Brainstorming sections approved iteratively in conversation on 2026-04-29.
- Awaiting user review of this written spec before invoking writing-plans.
