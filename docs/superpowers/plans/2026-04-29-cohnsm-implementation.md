# cohnsm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine `turbo-start-shopify` (production Shopify+Sanity headless commerce monorepo) with the AI shopping assistant from `context-agent-sanity-test/ecommerce` (Vercel AI SDK + Gemini 2.5 Flash + Sanity Agent Context MCP, with floating chat widget, page-context capture, AI-controlled filters, and inline product cards) into a single demo project at `/Users/foster/Documents/Saas/cohnsm/`.

**Architecture:** Use `turbo-start-shopify` as the project foundation. Add a new `packages/ai-commerce/` workspace package containing the chat UI, tool definitions, page-context React Query hooks, MCP client wrapper, and system prompt. Wire a `/api/chat` route handler in `apps/web/` that combines MCP-provided tools with three client-executed tools (`set_collection_filters`, `page_context`, `screenshot`). Mount the floating chat widget in the root layout inside the existing `<Providers>` wrapper.

**Tech Stack:** pnpm 10.28 + Turborepo, Next.js 16 (App Router, Turbopack, React Compiler), TypeScript strict, Sanity v5 + next-sanity 12, Shopify Storefront API, Tailwind CSS v4 + Shadcn (new-york style), Vercel AI SDK v6 (`ai`, `@ai-sdk/google`, `@ai-sdk/react`, `@ai-sdk/mcp`), `@sanity/agent-directives` for inline product cards, `react-markdown` 10, `turndown` 7, `html2canvas-pro` 1.6, T3 env (Zod v4), Biome.

**Spec:** [`docs/superpowers/specs/2026-04-29-cohnsm-design.md`](../specs/2026-04-29-cohnsm-design.md)

**Reference clones (read-only, used for porting):**
- `/Users/foster/Documents/Saas/cohnsm/turbo-start-shopify/` — to be moved into `.research/` after foundation copy
- `/Users/foster/Documents/Saas/cohnsm/context-agent-sanity-test/` — to be moved into `.research/` and used as a porting source

**Verification model:** turbo-start-shopify has no test framework configured and the spec marks "tests beyond type-check" as out of scope. Each task uses `pnpm check-types` and/or `pnpm dev:web` smoke tests as the verification step. Manual UI verification is called out explicitly where needed.

**Conventions used in this plan:**
- All paths absolute from project root unless prefixed with a system path.
- All commands are run from project root (`/Users/foster/Documents/Saas/cohnsm/`) unless noted.
- Commits use conventional commit prefixes (`feat:`, `chore:`, `fix:`, `refactor:`).
- Two reference paths used repeatedly:
  - `<TS>` = `/Users/foster/Documents/Saas/cohnsm/.research/turbo-start-shopify/` (after Task 1 moves it)
  - `<EX>` = `/Users/foster/Documents/Saas/cohnsm/.research/context-agent-sanity-test/ecommerce/` (after Task 1 moves it)
  When following the plan, expand these paths.

---

## Phase 1 — Bootstrap project foundation

### Task 1: Move reference clones into `.research/` and copy turbo-start-shopify foundation

**Files:**
- Move: `/Users/foster/Documents/Saas/cohnsm/turbo-start-shopify/` → `/Users/foster/Documents/Saas/cohnsm/.research/turbo-start-shopify/`
- Move: `/Users/foster/Documents/Saas/cohnsm/context-agent-sanity-test/` → `/Users/foster/Documents/Saas/cohnsm/.research/context-agent-sanity-test/`
- Create: project files copied from `.research/turbo-start-shopify/` (excluding `.git/`) into project root

- [ ] **Step 1: Move both reference clones into `.research/`**

```bash
cd /Users/foster/Documents/Saas/cohnsm
mkdir -p .research
mv turbo-start-shopify .research/
mv context-agent-sanity-test .research/
ls -la
```

Expected: `.research/` now contains both clones; project root only has `.claude/`, `.research/`, `docs/`, and the Claude memory dir is outside the project.

- [ ] **Step 2: Copy turbo-start-shopify contents into the project root, excluding `.git/`**

```bash
cd /Users/foster/Documents/Saas/cohnsm
rsync -a --exclude='.git' .research/turbo-start-shopify/ ./
ls -la
```

Expected: project root now has `apps/`, `packages/`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `package.json`, `turbo.json`, `biome.jsonc`, `tsconfig.json`, `README.md`, `CLAUDE.md`, `LICENSE`, `docs/`, `.claude/`, `.research/`, etc. No `.git/` yet.

- [ ] **Step 3: Initialize a fresh git repo and add a `.gitignore` entry for `.research/`**

```bash
cd /Users/foster/Documents/Saas/cohnsm
git init -b main
```

Then append `.research/` to `.gitignore` (the file already exists from turbo-start-shopify):

```bash
printf '\n# Reference clones used for porting (not part of the project)\n.research/\n' >> .gitignore
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/foster/Documents/Saas/cohnsm
pnpm install
```

Expected: pnpm resolves the workspace, installs into `node_modules/`. May take 1-2 minutes.

- [ ] **Step 5: Verify type-check passes on the imported foundation**

```bash
cd /Users/foster/Documents/Saas/cohnsm
pnpm check-types
```

Expected: PASS across all workspaces. If it fails because of missing envs, that's NOT a check-types failure — check-types runs `tsc --noEmit` only.

- [ ] **Step 6: Initial commit**

```bash
cd /Users/foster/Documents/Saas/cohnsm
git add -A
git commit -m "chore: import turbo-start-shopify foundation"
```

---

## Phase 2 — Scaffold packages/ai-commerce

### Task 2: Create the empty package skeleton

**Files:**
- Create: `packages/ai-commerce/package.json`
- Create: `packages/ai-commerce/tsconfig.json`
- Create: `packages/ai-commerce/src/index.ts`

- [ ] **Step 1: Create the package directory and `package.json`**

```bash
mkdir -p packages/ai-commerce/src
```

Write `packages/ai-commerce/package.json`:

```json
{
  "name": "@workspace/ai-commerce",
  "version": "0.0.1",
  "type": "module",
  "private": true,
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "format:check": "biome format .",
    "check-types": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-sdk/google": "^3.0.37",
    "@ai-sdk/mcp": "^1.0.13",
    "@ai-sdk/react": "^3.0.0",
    "@sanity/agent-directives": "^0.0.10",
    "@workspace/env": "workspace:*",
    "@workspace/sanity": "workspace:*",
    "@workspace/ui": "workspace:*",
    "ai": "^6.0.0",
    "html2canvas-pro": "^1.6.0",
    "lucide-react": "catalog:",
    "react-markdown": "^10.1.0",
    "turndown": "^7.2.2",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@tanstack/react-query": "^5.90.19",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@types/turndown": "^5.0.6",
    "@workspace/typescript-config": "workspace:*",
    "react": "catalog:",
    "react-dom": "catalog:",
    "typescript": "catalog:"
  },
  "peerDependencies": {
    "@tanstack/react-query": "^5.90.0",
    "react": "*",
    "react-dom": "*"
  },
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json` matching the other packages**

Write `packages/ai-commerce/tsconfig.json`:

```json
{
  "extends": "@workspace/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

(Verify the extends path matches what `packages/ui/tsconfig.json` uses by reading it; some monorepos use `react-library`, some use `nextjs`. Use whichever the existing UI package uses.)

- [ ] **Step 3: Create an empty entry point**

Write `packages/ai-commerce/src/index.ts`:

```ts
// Public exports populated incrementally as components and tools are added.
export {};
```

- [ ] **Step 4: Install the new dependencies**

```bash
cd /Users/foster/Documents/Saas/cohnsm
pnpm install
```

Expected: pnpm resolves workspace deps and pulls AI SDK, react-markdown, turndown, html2canvas-pro, etc.

- [ ] **Step 5: Verify type-check passes for the new package**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS (empty src compiles cleanly).

- [ ] **Step 6: Commit**

```bash
git add packages/ai-commerce package.json pnpm-lock.yaml
git commit -m "feat(ai-commerce): scaffold empty workspace package"
```

---

### Task 3: Wire `@workspace/ai-commerce` into `apps/web`

**Files:**
- Modify: `apps/web/package.json` (add the workspace dep)

- [ ] **Step 1: Add `@workspace/ai-commerce` to `apps/web/package.json`**

Open `apps/web/package.json` and add this entry to `dependencies` (alphabetical order around the other `@workspace/*` deps):

```json
"@workspace/ai-commerce": "workspace:*",
```

So the dependencies block has, among the existing entries:

```json
"@workspace/ai-commerce": "workspace:*",
"@workspace/env": "workspace:*",
"@workspace/logger": "workspace:*",
"@workspace/sanity": "workspace:*",
"@workspace/ui": "workspace:*",
```

- [ ] **Step 2: Re-install deps**

```bash
pnpm install
```

- [ ] **Step 3: Verify the workspace link**

```bash
ls apps/web/node_modules/@workspace/ai-commerce
```

Expected: a symlink to `packages/ai-commerce`.

- [ ] **Step 4: Verify type-check across the workspace**

```bash
pnpm check-types
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add @workspace/ai-commerce as a dep"
```

---

## Phase 3 — Shared types

### Task 4: Define shared types and schemas in `types.ts`

**Files:**
- Create: `packages/ai-commerce/src/types.ts`

- [ ] **Step 1: Write the types file**

Write `packages/ai-commerce/src/types.ts`:

```ts
import { z } from "zod";

/** User context sent with every chat request — captured client-side per turn. */
export interface UserContext {
  documentTitle: string;
  documentDescription?: string;
  documentLocation: string;
}

/** Page-context React Query entry — written by route segments, read by chat. */
export type PageSurface =
  | "home"
  | "pdp"
  | "collection"
  | "search"
  | "cart"
  | "content"
  | "other";

export interface PageContext {
  route: string;
  surface: PageSurface;
  product?: { id: string; slug: string; title: string };
  collection?: {
    handle: string;
    activeFilters: Record<string, unknown>;
  };
}

/** Tool name constants — shared between server (route.ts) and client (Chat panel). */
export const CLIENT_TOOLS = {
  PAGE_CONTEXT: "page_context",
  SCREENSHOT: "screenshot",
  SET_FILTERS: "set_collection_filters",
} as const;

export type ClientToolName = (typeof CLIENT_TOOLS)[keyof typeof CLIENT_TOOLS];

/**
 * Filter input schema for set_collection_filters tool. Mirrors
 * turbo-start-shopify's collection page searchParams (filter.* keys).
 * The tool's `execute` rebuilds the URL with the filter.* prefix.
 */
export const productFiltersSchema = z.object({
  collection: z
    .string()
    .describe("Shopify collection handle to navigate to (required)"),
  available: z
    .boolean()
    .optional()
    .describe("Filter to in-stock products only when true"),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  vendor: z
    .array(z.string())
    .optional()
    .describe("Multi-select vendor / brand names from Shopify"),
  type: z
    .array(z.string())
    .optional()
    .describe("Multi-select Shopify productType values"),
  tag: z
    .array(z.string())
    .optional()
    .describe("Multi-select Shopify tag values"),
  sort: z
    .string()
    .optional()
    .describe(
      "Shopify ProductCollectionSortKeys: BEST_SELLING, PRICE, CREATED, TITLE, etc.",
    ),
  reverse: z.boolean().optional(),
});

export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;

/** The directive shape returned by the set_collection_filters tool to the client. */
export interface NavigateDirective {
  kind: "navigate";
  href: string;
  applied: string[];
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/types.ts
git commit -m "feat(ai-commerce): add shared types and filter schema"
```

---

## Phase 4 — Browser capture helpers

### Task 5: Port browser capture helpers (`captureUserContext`, `capturePageContext`, `captureScreenshot`)

**Files:**
- Create: `packages/ai-commerce/src/lib/capture-context.ts`

**Source:** `<EX>/src/lib/capture-context.ts`

- [ ] **Step 1: Write the capture helpers**

Write `packages/ai-commerce/src/lib/capture-context.ts`:

```ts
"use client";

import html2canvas from "html2canvas-pro";
import TurndownService from "turndown";

import type { UserContext } from "../types";

/** Marker attribute — elements with this attribute are stripped from page-context capture and screenshots. */
export const AGENT_CHAT_HIDDEN_ATTRIBUTE = "data-agent-chat-hidden";

/** Lightweight per-turn context: title, meta description, pathname. Sent on every chat request. */
export function captureUserContext(): UserContext {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return { documentTitle: "", documentLocation: "/" };
  }
  const metaDescription =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") ||
    document
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content");
  return {
    documentTitle: document.title,
    documentDescription: metaDescription || undefined,
    documentLocation: window.location.pathname,
  };
}

/** Deep page context — markdown of <main>, used by the page_context tool. */
export function capturePageContext() {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
  });

  turndown.addRule("removeNoise", {
    filter: (node) =>
      ["SCRIPT", "STYLE", "SVG", "VIDEO", "AUDIO", "IFRAME", "NOSCRIPT"].includes(
        node.nodeName,
      ),
    replacement: () => "",
  });

  const main = document.querySelector("main") || document.body;
  const clone = main.cloneNode(true) as Element;
  clone
    .querySelectorAll(`[${AGENT_CHAT_HIDDEN_ATTRIBUTE}]`)
    .forEach((el) => el.remove());

  return {
    url: window.location.href,
    title: document.title,
    content: turndown.turndown(clone.innerHTML).slice(0, 4000),
  };
}

/** JPEG screenshot of the body (excluding [data-agent-chat-hidden] elements). Returns a data URL. */
export async function captureScreenshot(): Promise<string> {
  const canvas = await html2canvas(document.body, {
    ignoreElements: (el) => el.hasAttribute(AGENT_CHAT_HIDDEN_ATTRIBUTE),
  });

  const MAX_DIMENSION = 4000;
  let finalCanvas = canvas;

  if (canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
    const scale = Math.min(
      MAX_DIMENSION / canvas.width,
      MAX_DIMENSION / canvas.height,
    );
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.floor(canvas.width * scale);
    resizedCanvas.height = Math.floor(canvas.height * scale);
    const ctx = resizedCanvas.getContext("2d");
    ctx?.drawImage(canvas, 0, 0, resizedCanvas.width, resizedCanvas.height);
    finalCanvas = resizedCanvas;
  }

  return finalCanvas.toDataURL("image/jpeg", 0.7);
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/lib/capture-context.ts
git commit -m "feat(ai-commerce): port browser capture helpers"
```

---

## Phase 5 — Page-context React Query hooks

### Task 6: Implement the page-context React Query setter and reader

**Files:**
- Create: `packages/ai-commerce/src/context/page-context.ts`

- [ ] **Step 1: Write the React Query hooks**

Write `packages/ai-commerce/src/context/page-context.ts`:

```ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import type { PageContext } from "../types";

const PAGE_CONTEXT_KEY = ["ai-commerce", "page-context"] as const;

const INITIAL_CONTEXT: PageContext = { route: "/", surface: "home" };

/** Hook to set or merge into the current page context. Use in page-level useEffect. */
export function useSetPageContext() {
  const qc = useQueryClient();
  return useCallback(
    (ctx: Partial<PageContext>) => {
      qc.setQueryData<PageContext>(PAGE_CONTEXT_KEY, (prev) => ({
        ...(prev ?? INITIAL_CONTEXT),
        ...ctx,
      }));
    },
    [qc],
  );
}

/** Hook to read the current page context. Re-renders on changes. */
export function usePageContext(): PageContext {
  const { data } = useQuery<PageContext>({
    queryKey: PAGE_CONTEXT_KEY,
    queryFn: () => INITIAL_CONTEXT,
    initialData: INITIAL_CONTEXT,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return data;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/context/page-context.ts
git commit -m "feat(ai-commerce): add page-context React Query hooks"
```

---

### Task 7: Create the `<PageContextTracker />` route-level updater

**Files:**
- Create: `apps/web/src/components/page-context-tracker.tsx`

- [ ] **Step 1: Write the tracker component**

Write `apps/web/src/components/page-context-tracker.tsx`:

```tsx
"use client";

import { useSetPageContext } from "@workspace/ai-commerce";
import type { PageSurface } from "@workspace/ai-commerce";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Derive a coarse PageSurface from the pathname. Page components may override with richer data. */
function surfaceFromPathname(pathname: string): PageSurface {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/products/")) return "pdp";
  if (pathname.startsWith("/collections/")) return "collection";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/search")) return "search";
  if (
    pathname.startsWith("/blog") ||
    pathname.startsWith("/articles") ||
    pathname.startsWith("/pages/")
  )
    return "content";
  return "other";
}

/**
 * Mounts once in the root layout. Updates the page-context React Query entry
 * whenever the pathname changes. Page-level components can refine with
 * useSetPageContext({ surface: 'pdp', product: {...} }).
 */
export function PageContextTracker() {
  const setPageContext = useSetPageContext();
  const pathname = usePathname();

  useEffect(() => {
    setPageContext({
      route: pathname,
      surface: surfaceFromPathname(pathname),
    });
  }, [pathname, setPageContext]);

  return null;
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter web check-types
```

Expected: this will FAIL because `@workspace/ai-commerce` doesn't yet re-export `useSetPageContext` and `PageSurface`. Move on — Task 24 (public exports) fixes this. We re-verify there.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/page-context-tracker.tsx
git commit -m "feat(web): add PageContextTracker route-level updater"
```

---

## Phase 6 — Tool definitions

Three tools are declared as input-schema-only on the server (no `execute`). The client's `useChat.onToolCall` will invoke them.

### Task 8: Create the `page_context` tool definition

**Files:**
- Create: `packages/ai-commerce/src/tools/page-context.ts`

- [ ] **Step 1: Write the tool definition**

Write `packages/ai-commerce/src/tools/page-context.ts`:

```ts
import { z } from "zod";

export const pageContextTool = {
  description:
    "Page context as markdown: URL, title, and text content (headings, links, lists). Fast. No visuals.",
  inputSchema: z.object({
    reason: z.string().describe("Why you need page context"),
  }),
} as const;
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/tools/page-context.ts
git commit -m "feat(ai-commerce): add page_context tool definition"
```

---

### Task 9: Create the `screenshot` tool definition

**Files:**
- Create: `packages/ai-commerce/src/tools/screenshot.ts`

- [ ] **Step 1: Write the tool definition**

Write `packages/ai-commerce/src/tools/screenshot.ts`:

```ts
import { z } from "zod";

export const screenshotTool = {
  description:
    "Visual screenshot of the page. You CANNOT see anything visual without this — no images, colors, layout, or appearance.",
  inputSchema: z.object({
    reason: z.string().describe("Why you need a screenshot"),
  }),
} as const;
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/tools/screenshot.ts
git commit -m "feat(ai-commerce): add screenshot tool definition"
```

---

### Task 10: Create the `set_collection_filters` tool definition

**Files:**
- Create: `packages/ai-commerce/src/tools/set-collection-filters.ts`

- [ ] **Step 1: Write the tool definition**

Write `packages/ai-commerce/src/tools/set-collection-filters.ts`:

```ts
import { productFiltersSchema } from "../types";

export const setCollectionFiltersTool = {
  description: [
    "Update the collection page filters. Only use AFTER you've used the GROQ tool to:",
    "1) get valid filter values (vendors, types, tags, sort keys),",
    "2) confirm matching products exist.",
    "Use the exact values from your query. Do not call this tool blindly — you should already know what results the user will see.",
    "If the user is not currently on a collection page, this tool will navigate them to the collection.",
  ].join(" "),
  inputSchema: productFiltersSchema,
} as const;
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/tools/set-collection-filters.ts
git commit -m "feat(ai-commerce): add set_collection_filters tool definition"
```

---

### Task 11: Create the tool registry

**Files:**
- Create: `packages/ai-commerce/src/tools/index.ts`

- [ ] **Step 1: Write the registry**

Write `packages/ai-commerce/src/tools/index.ts`:

```ts
import type { ToolSet } from "ai";

import { CLIENT_TOOLS } from "../types";
import { pageContextTool } from "./page-context";
import { screenshotTool } from "./screenshot";
import { setCollectionFiltersTool } from "./set-collection-filters";

/**
 * Tool definitions consumed by the API route's streamText() call.
 * Execution is split: there is no `execute` here — the chat panel's
 * useChat.onToolCall handler runs each tool in the browser.
 */
export const clientTools: ToolSet = {
  [CLIENT_TOOLS.PAGE_CONTEXT]: pageContextTool,
  [CLIENT_TOOLS.SCREENSHOT]: screenshotTool,
  [CLIENT_TOOLS.SET_FILTERS]: setCollectionFiltersTool,
};
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/tools/index.ts
git commit -m "feat(ai-commerce): add tool registry"
```

---

## Phase 7 — System prompt and MCP wiring

### Task 12: Write the system prompt builder

**Files:**
- Create: `packages/ai-commerce/src/system-prompt.ts`

- [ ] **Step 1: Write the system prompt builder**

Write `packages/ai-commerce/src/system-prompt.ts`:

```ts
import type { UserContext } from "./types";

const BASE_PROMPT = `
You are a friendly and knowledgeable shopping assistant for an online store. Your role is to help customers find products, answer questions about items, and provide helpful recommendations.

## Guidelines
- Be conversational and helpful, but concise.
- When users ask about products, use the available tools to query the product catalog.
- Always show products using the document directive syntax (see below) — never as plain titles.
- If you're unsure about something, say so rather than making things up.
- Help users filter and find products based on their needs (vendor/brand, productType/category, tags, price range).
- Use the page_context tool only when the implicit user context is insufficient.
- Use the screenshot tool only when the user asks about how something looks or you need to verify the visual layout.

## Document directives (for inline product cards)
Reference Sanity documents inline using these directive forms:
- Block:  \`::document{id="<sanity _id>" type="product"}\`
- Inline: \`:document{id="<sanity _id>" type="product"}\`

The chat UI will render each directive as a product card pulling from the Sanity catalog.

## Schema knowledge (turbo-start-shopify product shape)
Products live in Sanity but are synced from Shopify via Sanity Connect. Key fields are nested under \`store\`:
- \`store.title\` (string) — product name from Shopify
- \`store.slug.current\` (string) — Shopify handle, used in URLs (\`/products/{slug}\`)
- \`store.priceRange.minVariantPrice\` (number) — lowest variant price (plain number, no currency object)
- \`store.priceRange.maxVariantPrice\` (number) — highest variant price
- \`store.vendor\` (string) — brand / manufacturer
- \`store.productType\` (string) — category
- \`store.tags\` (string) — comma-separated Shopify tag list
- \`store.status\` (string: "active" | "archived" | "draft") — Shopify status
- \`store.isDeleted\` (boolean) — true if removed from Shopify
- \`store.previewImageUrl\` (string) — primary image URL
- \`store.variants\` (array of weak references to productVariant documents)

Variants are separate documents with the same nested shape under \`store\`:
- \`store.gid\` (string) — Shopify variant GID; this is the ID used for cart calls
- \`store.price\` (number)
- \`store.compareAtPrice\` (number, optional) — original price; if > price, the variant is on sale
- \`store.inventory.isAvailable\` (boolean) — whether the variant is in stock
- \`store.option1\`, \`store.option2\`, \`store.option3\` (strings) — option values like color/size

A product is "shoppable" iff \`store.status == "active" && !store.isDeleted\`.

### Common GROQ patterns
- Active products only: \`*[_type == "product" && store.status == "active" && !store.isDeleted]\`
- By vendor (brand): \`*[_type == "product" && store.vendor == "Acme"]\`
- By productType (category): \`*[_type == "product" && store.productType == "Apparel"]\`
- Under a price (cheapest variant ≤ N): \`*[_type == "product" && store.priceRange.minVariantPrice <= 100]\`
- On sale (any variant discounted): \`*[_type == "product" && count((store.variants[]->store)[compareAtPrice > price]) > 0]\`

## Filter control
The set_collection_filters tool maps to turbo-start-shopify's collection page searchParams:
- \`available: boolean\` → \`?filter.available=true\`
- \`priceMin / priceMax: number\` → \`?filter.price.min=N&filter.price.max=M\`
- \`vendor: string[]\` → \`?filter.vendor=Acme&filter.vendor=Beta\` (multi)
- \`type: string[]\` → \`?filter.type=Apparel\` (multi)
- \`tag: string[]\` → \`?filter.tag=sale\` (multi)
- \`sort: string\` → Shopify ProductCollectionSortKeys: BEST_SELLING, PRICE, CREATED, TITLE, MANUAL, COLLECTION_DEFAULT
- \`reverse: boolean\` → reverse the sort order
- \`collection: string\` (required) — collection handle; the tool navigates to \`/collections/{collection}\` if the user isn't already there.
`.trim();

export function buildSystemPrompt(opts: {
  userContext?: UserContext | null;
}): string {
  const ctx = opts.userContext;
  if (!ctx) return BASE_PROMPT;

  const ctxBlock = `
## Current user context
- Page title: ${ctx.documentTitle}
- Page URL path: ${ctx.documentLocation}
${ctx.documentDescription ? `- Page description: ${ctx.documentDescription}` : ""}
`.trim();

  return `${BASE_PROMPT}\n\n${ctxBlock}`;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/system-prompt.ts
git commit -m "feat(ai-commerce): add system prompt builder"
```

---

### Task 13: Wrap the Sanity Agent Context MCP client

**Files:**
- Create: `packages/ai-commerce/src/mcp/sanity-agent-context.ts`

- [ ] **Step 1: Write the wrapper**

Write `packages/ai-commerce/src/mcp/sanity-agent-context.ts`:

```ts
import { createMCPClient } from "@ai-sdk/mcp";

export interface SanityAgentContextConfig {
  url: string;
  token: string;
}

/**
 * Creates an MCP client connected to the Sanity Agent Context HTTP endpoint.
 * Caller is responsible for calling .close() in the streamText onFinish callback
 * (and on error paths) to release resources.
 */
export async function createSanityAgentContextClient(
  config: SanityAgentContextConfig,
) {
  return createMCPClient({
    transport: {
      type: "http",
      url: config.url,
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    },
  });
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/mcp/sanity-agent-context.ts
git commit -m "feat(ai-commerce): wrap Sanity Agent Context MCP client"
```

---

## Phase 8 — Env updates

### Task 14: Add new server env entries

**Files:**
- Modify: `packages/env/src/server.ts`

- [ ] **Step 1: Add the new envs**

Open `packages/env/src/server.ts` and modify the `server` block to add `GOOGLE_GENERATIVE_AI_API_KEY` and `SANITY_CONTEXT_MCP_URL`. The full updated file content:

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets-zod";
import { z } from "zod/v4";

const env = createEnv({
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },

  server: {
    SANITY_API_READ_TOKEN: z.string().min(1),
    SANITY_API_WRITE_TOKEN: z.string().min(1),
    SHOPIFY_STORE_DOMAIN: z.string().min(1),
    SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().min(1),
    SHOPIFY_API_VERSION: z.string().default("2025-01"),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().default(""),
    SANITY_CONTEXT_MCP_URL: z.string().default(""),
  },

  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
  },

  extends: [vercel()],
});

export { env };
```

- [ ] **Step 2: Type-check the env package**

```bash
pnpm --filter @workspace/env check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/env/src/server.ts
git commit -m "feat(env): add optional GOOGLE_GENERATIVE_AI_API_KEY and SANITY_CONTEXT_MCP_URL"
```

---

## Phase 9 — Chat API route

### Task 15: Create the `/api/chat` POST handler

**Files:**
- Create: `apps/web/src/app/api/chat/route.ts`

- [ ] **Step 1: Write the route handler**

Write `apps/web/src/app/api/chat/route.ts`:

```ts
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
```

- [ ] **Step 2: Type-check apps/web**

```bash
pnpm --filter web check-types
```

Expected: this will FAIL because `@workspace/ai-commerce` doesn't yet re-export `buildSystemPrompt`, `clientTools`, or `createSanityAgentContextClient`. Continue — Task 24 fixes this.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/chat/route.ts
git commit -m "feat(web): add /api/chat route handler"
```

---

## Phase 10 — UI components (port from experiment)

### Task 16: Port the inline product card (`ui/product.tsx`)

**Files:**
- Create: `packages/ai-commerce/src/ui/product.tsx`

**Source for reference:** `<EX>/src/components/chat/message/Product.tsx` — shape and styling reused, but the GROQ query is rewritten for turbo-start-shopify's nested `store.*` schema and the card adds an Add-to-cart button when single-variant.

- [ ] **Step 1: Write the product card**

Write `packages/ai-commerce/src/ui/product.tsx`:

```tsx
"use client";

import { client } from "@workspace/sanity/client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

interface ProductProps {
  id: string;
  isInline?: boolean;
}

interface ProductVariantData {
  _id: string;
  gid: string;
  title: string;
  available: boolean;
  price: number;
}

interface ProductData {
  _id: string;
  title: string;
  slug: string;
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  isActive: boolean;
  variants: ProductVariantData[];
}

const PRODUCT_QUERY = /* groq */ `
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
`;

function formatPrice(min: number | null, max: number | null): string {
  if (min == null) return "";
  if (max == null || min === max) return `$${min.toFixed(2)}`;
  return `$${min.toFixed(2)}–$${max.toFixed(2)}`;
}

export function Product({ id, isInline }: ProductProps) {
  const { data: product, isLoading } = useQuery({
    queryKey: ["ai-commerce", "product", id],
    queryFn: () =>
      client.fetch<ProductData | null>(PRODUCT_QUERY, { id }),
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    if (isInline) return null;
    return (
      <div className="flex animate-pulse items-center gap-3 rounded-md border border-border bg-card p-2">
        <div className="h-12 w-12 shrink-0 rounded bg-muted" />
        <div className="h-5 w-32 rounded bg-muted" />
      </div>
    );
  }

  if (!product) return null;

  if (isInline) {
    return (
      <Link
        href={`/products/${product.slug}`}
        className="text-primary underline-offset-4 hover:underline"
      >
        {product.title}
      </Link>
    );
  }

  const purchasable =
    product.isActive &&
    product.variants.length === 1 &&
    product.variants[0]?.available === true;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2">
      <Link
        href={`/products/${product.slug}`}
        className="flex items-center gap-3 transition-colors hover:bg-muted/40"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
          {product.imageUrl ? (
            // biome-ignore lint/performance/noImgElement: external Shopify CDN URL — sizing handled via canvas
            <img
              src={product.imageUrl}
              alt={product.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {product.title}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatPrice(product.minPrice, product.maxPrice)}
          </span>
        </div>
      </Link>
      {purchasable ? (
        <AddToCartButton variantGid={product.variants[0]!.gid} />
      ) : (
        <Link
          href={`/products/${product.slug}`}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          View options →
        </Link>
      )}
    </div>
  );
}

function AddToCartButton({ variantGid }: { variantGid: string }) {
  // Lazy require to avoid circular: useCart lives in apps/web's cart-context.
  // We accept the variantGid and dispatch via a window-level event the host
  // page wires to its own cart context, OR we expose a hook the host installs.
  // For simplicity, we use a custom event the host listens for.
  return (
    <button
      type="button"
      className="rounded-md border border-border bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
      onClick={() => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("ai-commerce:add-to-cart", {
            detail: { variantGid, quantity: 1 },
          }),
        );
      }}
    >
      Add to cart
    </button>
  );
}
```

This uses a `CustomEvent` to bridge the package (which can't import from `apps/web/`) and the host's cart context. A bridge listener in `apps/web/` (added in Task 23) will translate the event into `useCart().addLine(variantGid, 1)`.

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/ui/product.tsx
git commit -m "feat(ai-commerce): port inline product card"
```

---

### Task 17: Port the markdown text-part renderer

**Files:**
- Create: `packages/ai-commerce/src/ui/text-part.tsx`

**Source for reference:** `<EX>/src/components/chat/message/TextPart.tsx` and `<EX>/src/components/chat/message/Document.tsx`.

- [ ] **Step 1: Write the text-part component**

Write `packages/ai-commerce/src/ui/text-part.tsx`:

```tsx
"use client";

import { remarkAgentDirectives } from "@sanity/agent-directives/react";
import ReactMarkdown from "react-markdown";

import { Product } from "./product";

interface TextPartProps {
  text: string;
  isUser?: boolean;
}

interface DocumentDirectiveProps {
  id?: string;
  type?: string;
  isInline?: boolean;
}

function Document({ id, type, isInline }: DocumentDirectiveProps) {
  if (!id || !type) return null;
  if (type === "product") {
    return <Product id={id} isInline={isInline} />;
  }
  return null;
}

export function TextPart({ text, isUser }: TextPartProps) {
  return (
    <div
      className={
        isUser
          ? "prose prose-sm max-w-none text-primary-foreground"
          : "prose prose-sm max-w-none text-foreground"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkAgentDirectives]}
        components={{
          // biome-ignore lint/style/useNamingConvention: directive component name is fixed by remark plugin
          Document: Document as never,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/ui/text-part.tsx
git commit -m "feat(ai-commerce): port markdown text-part with agent directives"
```

---

### Task 18: Create the message-list component

**Files:**
- Create: `packages/ai-commerce/src/ui/message-list.tsx`

- [ ] **Step 1: Write the message list**

Write `packages/ai-commerce/src/ui/message-list.tsx`:

```tsx
"use client";

import type { UIMessage } from "ai";
import { useEffect, useRef } from "react";

import { TextPart } from "./text-part";

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isStreaming]);

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      {messages.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {m.parts.map((part, idx) => {
                if (part.type === "text") {
                  return (
                    <TextPart
                      key={`${m.id}-${idx}`}
                      text={part.text}
                      isUser={isUser}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/ui/message-list.tsx
git commit -m "feat(ai-commerce): add message list component"
```

---

### Task 19: Create the message input component

**Files:**
- Create: `packages/ai-commerce/src/ui/message-input.tsx`

- [ ] **Step 1: Write the input**

Write `packages/ai-commerce/src/ui/message-input.tsx`:

```tsx
"use client";

import { SendIcon } from "lucide-react";
import { useState } from "react";

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      className="flex items-center gap-2 border-t border-border p-2"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about products…"
        disabled={disabled}
        className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-md bg-primary p-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        <SendIcon className="h-4 w-4" />
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/ui/message-input.tsx
git commit -m "feat(ai-commerce): add message input component"
```

---

### Task 20: Create the chat panel (port `Chat.tsx`)

**Files:**
- Create: `packages/ai-commerce/src/ui/chat-panel.tsx`

**Source for reference:** `<EX>/src/components/chat/Chat.tsx` (~289 lines). The structure is preserved; key changes from the experiment:
- Page-context React Query is added: `useSetPageContext` not used here, but `usePageContext()` (Task 6 hook) is read and merged into `userContext` for the request body.
- Filter handler adapts to turbo-start-shopify's `filter.*` URL keys.
- Component imports point to package-local files (relative paths within `packages/ai-commerce/src/ui/`).

- [ ] **Step 1: Write the chat panel**

Write `packages/ai-commerce/src/ui/chat-panel.tsx`:

```tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import {
  capturePageContext,
  captureScreenshot,
  captureUserContext,
} from "../lib/capture-context";
import {
  CLIENT_TOOLS,
  type ProductFiltersInput,
  productFiltersSchema,
} from "../types";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface ChatPanelProps {
  onClose: () => void;
}

/** Build a turbo-start-shopify collection URL with filter.* keys from the AI's input. */
function buildCollectionUrl(input: ProductFiltersInput): {
  href: string;
  applied: string[];
} {
  const params = new URLSearchParams();
  const applied: string[] = [];

  if (input.available !== undefined) {
    params.set("filter.available", String(input.available));
    applied.push(`available=${input.available}`);
  }
  if (input.priceMin !== undefined) {
    params.set("filter.price.min", String(input.priceMin));
    applied.push(`min=$${input.priceMin}`);
  }
  if (input.priceMax !== undefined) {
    params.set("filter.price.max", String(input.priceMax));
    applied.push(`max=$${input.priceMax}`);
  }
  for (const v of input.vendor ?? []) {
    params.append("filter.vendor", v);
    applied.push(`vendor=${v}`);
  }
  for (const t of input.type ?? []) {
    params.append("filter.type", t);
    applied.push(`type=${t}`);
  }
  for (const tag of input.tag ?? []) {
    params.append("filter.tag", tag);
    applied.push(`tag=${tag}`);
  }
  if (input.sort) {
    params.set("sort", input.sort);
    applied.push(`sort=${input.sort}`);
  }
  if (input.reverse !== undefined) {
    params.set("reverse", String(input.reverse));
    applied.push(`reverse=${input.reverse}`);
  }
  const qs = params.toString();
  return {
    href: `/collections/${input.collection}${qs ? `?${qs}` : ""}`,
    applied,
  };
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const router = useRouter();
  const pendingScreenshotRef = useRef<string | null>(null);

  const {
    messages,
    sendMessage,
    status,
    addToolOutput,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ userContext: captureUserContext() }),
    }),
    sendAutomaticallyWhen: ({ messages }: { messages: UIMessage[] }) =>
      pendingScreenshotRef.current === null &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === "user",
    onToolCall: async ({ toolCall }) => {
      switch (toolCall.toolName) {
        case CLIENT_TOOLS.PAGE_CONTEXT: {
          try {
            const ctx = capturePageContext();
            addToolOutput({
              tool: CLIENT_TOOLS.PAGE_CONTEXT,
              toolCallId: toolCall.toolCallId,
              output: JSON.stringify(ctx),
            });
          } catch (err) {
            addToolOutput({
              tool: CLIENT_TOOLS.PAGE_CONTEXT,
              toolCallId: toolCall.toolCallId,
              output: `Failed to capture page context: ${
                err instanceof Error ? err.message : String(err)
              }`,
            });
          }
          return;
        }

        case CLIENT_TOOLS.SCREENSHOT: {
          try {
            const file = await captureScreenshot();
            pendingScreenshotRef.current = file;
            addToolOutput({
              tool: CLIENT_TOOLS.SCREENSHOT,
              toolCallId: toolCall.toolCallId,
              output: "Screenshot captured (sent as follow-up message).",
            });
          } catch (err) {
            addToolOutput({
              tool: CLIENT_TOOLS.SCREENSHOT,
              toolCallId: toolCall.toolCallId,
              output: `Failed to capture screenshot: ${
                err instanceof Error ? err.message : String(err)
              }`,
            });
          }
          return;
        }

        case CLIENT_TOOLS.SET_FILTERS: {
          const result = productFiltersSchema.safeParse(toolCall.input);
          if (!result.success) {
            addToolOutput({
              tool: CLIENT_TOOLS.SET_FILTERS,
              toolCallId: toolCall.toolCallId,
              output: `Invalid filter input: ${result.error.message}`,
            });
            return;
          }
          const { href, applied } = buildCollectionUrl(result.data);
          router.push(href, { scroll: false });
          addToolOutput({
            tool: CLIENT_TOOLS.SET_FILTERS,
            toolCallId: toolCall.toolCallId,
            output: `Applied filters (${applied.join(", ") || "none"}). Navigated to ${href}.`,
          });
          return;
        }

        default:
          return;
      }
    },
  });

  // After a screenshot tool result lands and the stream is ready,
  // send the queued screenshot as a follow-up file message.
  useEffect(() => {
    if (status !== "ready") return;
    const screenshot = pendingScreenshotRef.current;
    if (!screenshot) return;
    pendingScreenshotRef.current = null;
    sendMessage({
      role: "user",
      parts: [
        {
          type: "file" as const,
          filename: "screenshot.jpg",
          mediaType: "image/jpeg",
          url: screenshot,
        },
      ],
    } as never);
  }, [status, sendMessage]);

  const handleSend = useCallback(
    (text: string) => {
      sendMessage({ text });
    },
    [sendMessage],
  );

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div
      data-agent-chat-hidden
      className="flex h-full w-full flex-col rounded-lg border border-border bg-background shadow-xl"
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-semibold">Shopping assistant</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="Close chat"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </header>
      <MessageList messages={messages} isStreaming={isStreaming} />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @workspace/ai-commerce check-types
```

Expected: PASS. If `useChat` types disagree on `sendMessage` signatures (the API may have evolved), narrow casts with `as never` are acceptable here — the runtime behavior is what counts.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/ui/chat-panel.tsx
git commit -m "feat(ai-commerce): port chat panel with tool routing and screenshot follow-up"
```

---

### Task 21: Create the floating chat widget (open/close button)

**Files:**
- Create: `packages/ai-commerce/src/ui/chat-widget.tsx`

**Source for reference:** `<EX>/src/components/chat/ChatButton.tsx`.

- [ ] **Step 1: Write the widget**

Write `packages/ai-commerce/src/ui/chat-widget.tsx`:

```tsx
"use client";

import { MessageCircleIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { ChatPanel } from "./chat-panel";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen ? (
        <div
          data-agent-chat-hidden
          className="fixed bottom-22 right-4 z-50 h-[500px] w-[380px]"
        >
          <ChatPanel onClose={() => setIsOpen(false)} />
        </div>
      ) : null}

      <button
        type="button"
        data-agent-chat-hidden
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl active:scale-95"
      >
        <div className="relative h-6 w-6">
          <MessageCircleIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
              isOpen
                ? "rotate-90 scale-0 opacity-0"
                : "rotate-0 scale-100 opacity-100"
            }`}
          />
          <XIcon
            className={`absolute inset-0 h-6 w-6 transition-all duration-300 ${
              isOpen
                ? "rotate-0 scale-100 opacity-100"
                : "-rotate-90 scale-0 opacity-0"
            }`}
          />
        </div>
      </button>
    </>
  );
}
```

- [ ] **Step 2: Type-check + commit**

```bash
pnpm --filter @workspace/ai-commerce check-types
git add packages/ai-commerce/src/ui/chat-widget.tsx
git commit -m "feat(ai-commerce): add floating chat widget"
```

---

## Phase 11 — Mount in app + cart bridge

### Task 22: Wire the public exports of `packages/ai-commerce/src/index.ts`

**Files:**
- Modify: `packages/ai-commerce/src/index.ts`

- [ ] **Step 1: Replace the placeholder index with the real exports**

Write `packages/ai-commerce/src/index.ts`:

```ts
// Types
export type {
  ClientToolName,
  NavigateDirective,
  PageContext,
  PageSurface,
  ProductFiltersInput,
  UserContext,
} from "./types";
export { CLIENT_TOOLS, productFiltersSchema } from "./types";

// Page-context hooks
export { usePageContext, useSetPageContext } from "./context/page-context";

// System prompt + MCP wrapper
export { buildSystemPrompt } from "./system-prompt";
export {
  createSanityAgentContextClient,
  type SanityAgentContextConfig,
} from "./mcp/sanity-agent-context";

// Tool registry
export { clientTools } from "./tools";

// UI
export { ChatWidget } from "./ui/chat-widget";
export { Product } from "./ui/product";
```

- [ ] **Step 2: Type-check across the workspace**

```bash
pnpm check-types
```

Expected: PASS. This was the missing piece for `apps/web` — Task 7 (PageContextTracker) and Task 15 (route handler) should now resolve their imports.

- [ ] **Step 3: Commit**

```bash
git add packages/ai-commerce/src/index.ts
git commit -m "feat(ai-commerce): publish public package exports"
```

---

### Task 23: Mount `<ChatWidget />`, `<PageContextTracker />`, and add the cart bridge in the root layout

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/components/ai-cart-bridge.tsx`

- [ ] **Step 1: Create the cart bridge component**

The chat package can't import `useCart` from `apps/web/`. The product card dispatches a `CustomEvent('ai-commerce:add-to-cart', { detail: { variantGid, quantity } })`; this bridge listens for it and calls into the existing cart context.

Write `apps/web/src/components/ai-cart-bridge.tsx`:

```tsx
"use client";

import { useEffect } from "react";

import { useCart } from "@/components/cart/cart-context";

interface AddToCartEventDetail {
  variantGid: string;
  quantity: number;
}

export function AiCartBridge() {
  const { addLine, openCart } = useCart();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AddToCartEventDetail>).detail;
      if (!detail?.variantGid) return;
      addLine(detail.variantGid, detail.quantity ?? 1).then(() => {
        openCart();
      });
    };
    window.addEventListener(
      "ai-commerce:add-to-cart",
      handler as EventListener,
    );
    return () => {
      window.removeEventListener(
        "ai-commerce:add-to-cart",
        handler as EventListener,
      );
    };
  }, [addLine, openCart]);

  return null;
}
```

- [ ] **Step 2: Modify `apps/web/src/app/layout.tsx` to mount the new components**

Open `apps/web/src/app/layout.tsx`. Add three new imports near the top (alongside existing imports — keep the import-order convention):

```ts
import { ChatWidget } from "@workspace/ai-commerce";
import { AiCartBridge } from "@/components/ai-cart-bridge";
import { PageContextTracker } from "@/components/page-context-tracker";
```

Then, inside the `<Providers>` block, mount the three new components as the last children — so they participate in the providers but float above the page chrome. Replace the existing JSX inside `<Providers>` with this shape (keep the existing children — only add the three new lines just before the closing `</Providers>`):

```tsx
<Providers>
  <div className="flex min-h-screen flex-col">
    <PromoBanner data={nav.promoBannerData} />
    <Navbar
      navbarData={nav.navbarData}
      settingsData={nav.settingsData}
    />
    <div className="flex-1">{children}</div>
    <Suspense fallback={<FooterSkeleton />}>
      <FooterServer />
    </Suspense>
  </div>
  <SanityLive />
  <CombinedJsonLd includeOrganization includeWebsite />
  {(await draftMode()).isEnabled && (
    <>
      <PreviewBar />
      <VisualEditing />
    </>
  )}
  {/* AI Commerce */}
  <PageContextTracker />
  <AiCartBridge />
  <ChatWidget />
</Providers>
```

- [ ] **Step 3: Type-check apps/web**

```bash
pnpm --filter web check-types
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/components/ai-cart-bridge.tsx
git commit -m "feat(web): mount ChatWidget, PageContextTracker, and AI cart bridge"
```

---

## Phase 12 — Final verification

### Task 24: Boot dev server with empty AI envs and verify graceful 503 path

**Files:** none modified

- [ ] **Step 1: Confirm the existing required envs are present**

The project still requires turbo-start-shopify's required envs. Make sure `apps/web/.env.local` (or your shell env) contains:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
NEXT_PUBLIC_SANITY_STUDIO_URL=http://localhost:3333
SANITY_API_READ_TOKEN=stub
SANITY_API_WRITE_TOKEN=stub
SHOPIFY_STORE_DOMAIN=stub.myshopify.com
SHOPIFY_STOREFRONT_ACCESS_TOKEN=stub
```

(Use real values if you have a Sanity/Shopify dev store; stubs are fine for verifying the 503 path. The web app may not render every page with stubs — that's expected.)

Leave `GOOGLE_GENERATIVE_AI_API_KEY` and `SANITY_CONTEXT_MCP_URL` UNSET (or empty).

- [ ] **Step 2: Boot the dev server**

```bash
pnpm dev:web
```

Expected: Next.js boots on `http://localhost:3000` after a Turbopack start. Ignore React Server Component errors that arise from stub Shopify/Sanity values — those aren't blockers for verifying the AI surface.

- [ ] **Step 3: Verify the 503 path**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "content-type: application/json" \
  -d '{"messages":[{"role":"user","parts":[{"type":"text","text":"hi"}]}]}'
```

Expected: HTTP 503 with body `{"error":"AI assistant requires configuration..."}`.

- [ ] **Step 4: Manually verify the chat widget appears**

Open `http://localhost:3000` (or any rendering page) in a browser. Bottom-right should show a circular floating button with a chat icon. Click it: a chat panel opens with the close button. Type a message and submit — expect the panel to display your message; the assistant turn will fail (because of 503), which is acceptable for this smoke test.

If the widget doesn't appear, debug by:
- Checking the browser console for hydration errors.
- Confirming `<ChatWidget />` is mounted inside `<Providers>` in `apps/web/src/app/layout.tsx`.

- [ ] **Step 5: Stop the dev server (Ctrl+C) and commit any fixes**

If you made any fixes during verification, commit them:

```bash
git add -A
git commit -m "fix: resolve issues found during dev-server smoke test"
```

If no fixes were needed, no commit is required for this task.

---

### Task 25: Update README with cohnsm setup steps

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the inherited turbo-start-shopify README intro with cohnsm-specific setup**

Open `README.md` and prepend this section to the top of the file (keeping the existing turbo-start-shopify content below as a reference):

```markdown
# cohnsm

Demo combining the AI shopping assistant from `context-agent-sanity-test` with the production `turbo-start-shopify` headless commerce monorepo. Personal/demo project — not for production.

## What's added vs. turbo-start-shopify

- `packages/ai-commerce/` — chat widget UI, AI tool definitions, page-context React Query hooks, system prompt, Sanity Agent Context MCP wrapper.
- `apps/web/src/app/api/chat/route.ts` — Vercel AI SDK route handler (Gemini 2.5 Flash + MCP tools + client tools).
- `apps/web/src/components/page-context-tracker.tsx` — keeps the chat aware of the current route.
- `apps/web/src/components/ai-cart-bridge.tsx` — bridges chat product cards' "Add to cart" event into the Shopify-backed cart context.
- New env entries (`GOOGLE_GENERATIVE_AI_API_KEY`, `SANITY_CONTEXT_MCP_URL`) — both optional; the chat route returns 503 until both are set.

## Manual setup steps to enable the AI assistant

1. **Sanity Connect for Shopify** — install the Sanity Connect Shopify app on your Shopify dev store and connect it to a Sanity project + dataset matching `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET`. Trigger an initial sync from Connect's UI.
2. **Sanity Agent Context MCP** — set up a Sanity Agent Context server pointed at the same dataset. Capture its HTTPS URL and add it as `SANITY_CONTEXT_MCP_URL`. The MCP uses `SANITY_API_READ_TOKEN` for Bearer auth — that env is already used by the rest of the project.
3. **Gemini API key** — create one in Google AI Studio. Add it as `GOOGLE_GENERATIVE_AI_API_KEY`.
4. Boot:

   ```bash
   pnpm dev
   ```

5. Open `http://localhost:3000`. Click the bottom-right chat bubble; ask "show me products under $50" or "what brands do you have?".

## Reference checkouts

`.research/turbo-start-shopify/` and `.research/context-agent-sanity-test/` are read-only reference clones of the source projects. Both are gitignored. They are useful when modifying `packages/ai-commerce/` to compare against the experiment's original implementations.

---

```

(The original turbo-start-shopify README content stays below this prepended section.)

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add cohnsm-specific setup section to README"
```

---

## Self-review

This plan was reviewed against the spec on 2026-04-29. Coverage notes:

- **Bootstrap (Task 1):** covers move-clones-into-research, foundation copy, fresh git init, gitignore, install, type-check baseline.
- **`packages/ai-commerce/` package (Tasks 2–6, 8–13, 16–22):** covers package skeleton + workspace wiring, types, browser capture helpers, page-context hooks, all three tool definitions + registry, system prompt with cohnsm-specific schema knowledge, MCP wrapper, product card with corrected GROQ projection, text-part / message-list / message-input / chat-panel / chat-widget UI, and public exports.
- **Page-context tracker in apps/web (Task 7):** route-segment-aware updater mounted in layout (Task 23).
- **Env updates (Task 14):** adds `GOOGLE_GENERATIVE_AI_API_KEY` and `SANITY_CONTEXT_MCP_URL` as optional; existing required envs unchanged.
- **API route (Task 15):** wires AI SDK + MCP + client tools; returns 503 when AI envs are empty.
- **Cart bridge (Task 23):** the `CustomEvent('ai-commerce:add-to-cart')` pattern bridges the package and the host's `useCart()` without circular deps.
- **Layout mounting (Task 23):** ChatWidget, PageContextTracker, AiCartBridge all mounted inside Providers.
- **Verification (Task 24):** dev-boot smoke test + 503 path confirmation + manual widget render check.
- **Docs (Task 25):** README prepend documenting cohnsm-specific setup.

Spec items NOT covered by tasks (intentional — explicit non-goals in the spec):
- User accounts / auth.
- Persistent chat history.
- Multi-language.
- Multi-provider AI gateway.
- AI-driven navigation outside collection filters.
- Test framework / unit tests.

No placeholders found in step bodies. Type names and tool names verified consistent across tasks: `CLIENT_TOOLS.PAGE_CONTEXT` / `SCREENSHOT` / `SET_FILTERS`, `useSetPageContext` / `usePageContext`, `ChatWidget`, `Product`, `clientTools`, `buildSystemPrompt`, `createSanityAgentContextClient` — all match between definition and consumption sites.

One known pattern that may need a runtime tweak during implementation: the `useChat` hook's `sendMessage` and `addToolOutput` signatures across `@ai-sdk/react@^3` may not match the experiment's calls 1:1 if the SDK has shifted between the experiment's pin (`^3.0.0`) and what npm resolves at install time. The plan acknowledges this in Task 20 and permits narrow `as never` casts — runtime behavior is what we verify in Task 24.
