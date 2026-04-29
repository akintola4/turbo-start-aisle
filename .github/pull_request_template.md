<!--
Thanks for contributing to Turbo Start Aisle! Fill in the sections below.
Remove any that don't apply.
-->

## Summary

<!-- One or two sentences. What does this PR change, and why? -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing behavior to change)
- [ ] Refactor / cleanup (no functional change)
- [ ] Documentation
- [ ] Build / tooling / CI

## Affected area

- [ ] `apps/web` (Next.js storefront, including `/api/chat` route)
- [ ] `apps/studio` (Sanity Studio)
- [ ] `packages/ai-commerce` (chat widget, AI tools, MCP wrapper)
- [ ] `packages/env`, `packages/sanity`, `packages/ui`, `packages/logger`, `packages/typescript-config`
- [ ] Documentation / README / CONTRIBUTING

## How was this tested?

<!--
Be specific. "Tested locally" is not enough.

For chat / AI changes, manual verification in the browser is required:
- Boot `pnpm dev` with `GOOGLE_GENERATIVE_AI_API_KEY` and `SANITY_CONTEXT_MCP_URL` set
- Open the chat widget and exercise the affected tool / flow
- Note what you typed and what the AI returned
-->

## Checklist

- [ ] `pnpm check-types` passes
- [ ] `pnpm lint` passes (warnings are acceptable; errors are not)
- [ ] No new dependencies added without justification in the PR description
- [ ] No secrets, tokens, or `.env.*` files committed
- [ ] If this changes `packages/ai-commerce/`, the chat widget was manually exercised in the browser
- [ ] If this touches the AI route or tool surface, the **security notes** in `apps/web/src/app/api/chat/route.ts` were considered (auth, rate-limit, payload size, error handling)

## Related issues

<!-- Link issues this PR closes, e.g. "Closes #12" -->

## Screenshots / recordings

<!-- For UI changes. Drag-and-drop directly into the PR body. -->
