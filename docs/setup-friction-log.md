# Setup Friction Log

Issues encountered while setting up Turbo Start Aisle from scratch on a clean machine, captured for upstream reporting / future README improvements.

## Genuine bugs (worth fixing in this repo)

### 1. Tailwind v4 content scan didn't include `packages/ai-commerce/`

**Symptom:** Chat widget rendered with the wrong size and position — outer `<button>` was 24×24 instead of 56×56, positioned at `y: 3093` instead of fixed at viewport bottom-right. Some Tailwind classes (`flex`, `z-50`) worked because they were used elsewhere in the codebase; classes only used in `packages/ai-commerce/` (`h-14`, `w-14`, `fixed`, `bottom-4`, `right-4`, `rounded-full`) got purged from the generated CSS.

**Root cause:** `packages/ui/src/styles/globals.css` had `@source` directives for `apps/`, `components/`, and `packages/ui/src/`, but not `packages/ai-commerce/`.

**Fix applied:** Added `@source "../../../ai-commerce/**/*.{ts,tsx}";` to `packages/ui/src/styles/globals.css`.

**Recommendation:** Either widen the existing `@source "../**/*.{ts,tsx}"` to scan all packages, or document that any new workspace package containing JSX needs its own `@source` line.

### 2. `bottom-22` is not a real Tailwind class

**Symptom:** Chat panel positioning was wrong (slightly off when the widget opened).

**Root cause:** `packages/ai-commerce/src/ui/chat-widget.tsx` (the original port from `context-agent-sanity-test`) used `bottom-22`. Standard Tailwind only ships `bottom-20` and `bottom-24` — `bottom-22` was silently ignored.

**Fix applied:** Replaced with inline `style={{ bottom: "5.5rem" }}`. Also moved the entire button to inline styles so it can't ever be purged.

### 3. Stale `apps/studio/dist/static/create-manifest.json` overrides env

**Symptom:** Even after writing a correct `apps/studio/.env`, `sanity schema deploy` kept reading the project ID from the cached manifest. The CLI logged an upstream/foreign project ID (`giyb0t1y`-style) and refused to deploy due to lack of grants.

**Root cause:** `sanity schema deploy` reads from `dist/static/create-manifest.json` if present. A previous build (potentially from the upstream template's example data) leaves a stale manifest with the upstream's project ID.

**Fix applied:** `rm -rf apps/studio/dist apps/studio/schema.json` before re-running.

**Recommendation:** Add an `apps/studio/dist/` cleanup step to the schema deploy script, or make the schema CLI prefer env over the cached manifest when both are present. At minimum, document the cache-clear step in the README.

### 4. `apps/studio/sanity.cli.ts` falls back to a hardcoded studio host (`"roboto-shopify"`)

**Symptom:** CLI logs `Sanity Studio Host: https://roboto-shopify.sanity.studio` even on a fresh fork, before falling back to the project ID.

**Root cause:** `getStudioHost()` in `apps/studio/sanity.cli.ts` returns `"roboto-shopify"` as a default when no `SANITY_STUDIO_PRODUCTION_HOSTNAME` is set and `projectId` is falsy.

**Recommendation:** Change the fallback to something neutral like `"my-studio"` or just `undefined`, so users don't see a stranger's hostname in their CLI output.

### 5. Shopify default API version is stale

**Symptom:** `Storefront API Client: the provided apiVersion ("2025-01") is likely deprecated or not supported. Currently supported API versions: 2025-07, 2025-10, 2026-01, 2026-04, 2026-07, unstable`.

**Root cause:** `packages/env/src/server.ts` defaults `SHOPIFY_API_VERSION` to `"2025-01"` which Shopify has since deprecated.

**Recommendation:** Bump the default to a currently-supported version (e.g., `2026-04`) and add a note in README to update it periodically.

### 6. Bug-report email leaked from upstream into committed templates

**Symptom:** `SECURITY.md` and `CODE_OF_CONDUCT.md` shipped with `hrithik@robotostudio.com` as the contact address.

**Recommendation:** Replace the upstream contributor's contact with a placeholder like `<your-email@example.com>` in the template.

### 7. `seed-data.tar.gz` doesn't include a `homePage` document

**Symptom:** After running `pnpm exec sanity dataset import ./seed-data.tar.gz production --missing`, the storefront homepage (`/`) renders empty/404 because no `homePage` document exists. User had to manually create one in Studio.

**Recommendation:** Either include a published `homePage` singleton in the seed data, or document that step explicitly in the README.

### 8. Co-Author trailer left in initial commit

When using AI-assisted setup tools (Claude Code, Cursor, etc.), a `Co-Authored-By: Claude …` trailer ends up in the bootstrap commit. Required `git filter-branch` + force-push to clean up after publishing.

**Recommendation:** This is more an AI-tool issue than a turbo-start-aisle issue, but a CONTRIBUTING note about preferred commit attribution would help.

## Documentation / DX gaps (not bugs, but ergonomics)

### 9. Two env files (`.env` and `.env.local`) cause confusion

In Next.js, `.env.local` overrides `.env`. Easy to put values in one and have them silently overridden by stale values in the other.

**Recommendation:** Pick one canonical location. README could explicitly say *"only edit `apps/web/.env.local` — `.env` is reserved for committed defaults."*

### 10. API version env validation is too loose

`NEXT_PUBLIC_SANITY_API_VERSION=2025-10` (missing day) passed env validation but failed at runtime in `@sanity/client` with an unhelpful error trace.

**Recommendation:** Tighten the Zod schema in `packages/env/src/client.ts`:
```ts
NEXT_PUBLIC_SANITY_API_VERSION: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
```

### 11. `pnpm build` requires real Sanity creds

The build process resolves Sanity content (redirects, navigation) at compile time, so stub envs cause the build to fail during "Dataset not found" rather than emitting a warning.

**Recommendation:** Either gate the redirect/nav fetch behind `process.env.NODE_ENV === "production"` checks, or document that real creds are required to build (not just to run).

### 12. Studio CLI authentication is global, not per-project

`sanity login` writes credentials to `~/.config/sanity/`. If a developer is logged in as account A but tries to deploy to a project owned by account B, the failure message ("missing required grant") is technically correct but obscure. Required `sanity logout && sanity login` to fix.

**Recommendation:** Add a troubleshooting section to README:
> If schema deploy fails with `missing required grant`, you're logged into the wrong Sanity account. Run `pnpm --filter studio exec sanity logout && pnpm --filter studio exec sanity login`.

## Environmental / network (not a bug)

### 13. VPN blocked `cdn.shopify.com`

While dev was running, image fetches to `cdn.shopify.com` returned `ENOTFOUND` despite DNS resolving correctly. Disabling the VPN restored access. (Common with split-tunnel VPNs that route certain CDNs differently.)

**Recommendation:** Add to README troubleshooting: *"If `_next/image` returns 500 with `ENOTFOUND cdn.shopify.com`, your VPN may be intercepting CDN traffic. Disable the VPN or whitelist `*.shopify.com`."*

### 14. GitHub OAuth token needed `workflow` scope to push

Initial `git push` rejected because the inherited `.github/workflows/deploy-sanity.yml` requires `workflow` scope on the OAuth token. Required `gh auth refresh -h github.com -s workflow`.

**Recommendation:** Either include this in the README setup, or remove the inherited workflow and let users add their own.

---

## Order issues were hit (chronological)

1. Bootstrap: copied turbo-start-shopify foundation.
2. Created Sanity project (`cohnsm`, ID `giyb0t1y`).
3. `sanity schema deploy` failed — wrong account logged in (#12).
4. Re-login fixed it; deploy succeeded.
5. `pnpm dev:web` failed — `NEXT_PUBLIC_SANITY_API_VERSION` malformed (#10).
6. After fix: storefront 401 from Shopify — token scopes missing (#5/#7).
7. After fix: VPN issue blocked images (#13).
8. After fix: home page rendered empty — no `homePage` document (#7).
9. Manually created home page in Studio.
10. Chat widget invisible — Tailwind purge (#1) + `bottom-22` typo (#2).
11. After widget fix: AI envs (`GOOGLE_GENERATIVE_AI_API_KEY` + `SANITY_CONTEXT_MCP_URL`) needed for chat to actually respond.
